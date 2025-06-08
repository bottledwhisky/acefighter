import React, { JSX, ReactNode } from "react";
import Image from "next/image";
import {
  DestroyPieceResponse,
  GameClient,
  GameRemote,
  SimplePiece,
  SimplePosition,
} from "./gameClient";
import Missile from "@/app/animations/missile";
import MenuItem from "@/app/MenuItem";
import { LocalizeFunc, Stringifyable } from "./i18n";
import { basePath } from "@/config";

export enum Player {
  Player1 = "Player1",
  Player2 = "Player2",
  NPC = "NPC",
}

const playerColor = {
  [Player.Player1]: "blue",
  [Player.Player2]: "red",
  [Player.NPC]: "gray",
};

export class Position {
  constructor(public x: number, public y: number) { }

  add(other: Position, times: number = 1): Position {
    return new Position(this.x + other.x * times, this.y + other.y * times);
  }

  substract(other: Position): Position {
    return new Position(this.x - other.x, this.y - other.y);
  }

  dotMul(other: Position): Position {
    return new Position(this.x * other.x, this.y * other.y);
  }

  unit(): Position {
    const length = this.length();
    return new Position(this.x / length, this.y / length);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  isOutOfBound(width: number, height: number): boolean {
    return this.x < 0 || this.x >= width || this.y < 0 || this.y >= height;
  }

  distance(position: Position, direction?: Direction): number {
    const rawDist = Math.abs(this.x - position.x) + Math.abs(this.y - position.y);
    const dirDist = direction ? position.substract(this).dotMul(directionDeltas[direction]).unit().length() / 10 : 0;
    return rawDist - dirDist;
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  rotate(width: number, height: number): Position {
    // rotate by 180 deg
    return new Position(width - this.x - 1, height - this.y - 1);
  }

  simple(): SimplePosition {
    return { x: this.x, y: this.y };
  }
}

export enum Direction {
  Up = "Up",
  Down = "Down",
  Left = "Left",
  Right = "Right",
}

const directionDeltas = {
  [Direction.Up]: new Position(0, -1),
  [Direction.Down]: new Position(0, 1),
  [Direction.Left]: new Position(-1, 0),
  [Direction.Right]: new Position(1, 0),
};

export function leftDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Up:
      return Direction.Left;
    case Direction.Down:
      return Direction.Right;
    case Direction.Left:
      return Direction.Down;
    case Direction.Right:
      return Direction.Up;
  }
}

export function rightDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Up:
      return Direction.Right;
    case Direction.Down:
      return Direction.Left;
    case Direction.Left:
      return Direction.Up;
    case Direction.Right:
      return Direction.Down;
  }
}

export function backwardDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Up:
      return Direction.Down;
    case Direction.Down:
      return Direction.Up;
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
  }
}

type DOMRect = { x: number, y: number, width: number, height: number };
type ActionCB = (pieceDOM: DOMRect) => void;

export class Move {
  constructor(
    public piece: Piece,
    public moveTo: { position: Position; direction: Direction },
    public actions: string[],
    public killTarget?: Piece,
    public priority: number = 0,
  ) { }
}

export abstract class Piece {
  player: Player;
  direction: Direction;
  game: GameModel = null as unknown as GameModel;
  position: Position;
  moved: boolean = false;

  constructor(
    player: Player,
    direction: Direction = Direction.Up,
    position: Position
  ) {
    this.player = player;
    this.direction = direction;
    this.position = position;
  }

  clone(): Piece {
    const clone = new (this.constructor as new (
      player: Player,
      direction: Direction,
      position: Position
    ) => Piece)(this.player, this.direction, this.position);
    clone.game = this.game;
    clone.moved = this.moved;
    return clone;
  }

  abstract name: string;

  move(p: Position, direction: Direction): void {
    this.game.movePiece(this.position, p, direction);
  }

  abstract getActions(): [string, ActionCB, () => React.ReactNode][];
  getPossibleMoves(): { position: Position; direction: Direction }[] {
    if (this.moved) return [];
    return this.getMoves();
  }
  abstract getMoves(): { position: Position; direction: Direction }[];
  onBeginOfTurn(): void {
    this.moved = this.getMoves().length === 0;
  }
  onEndOfTurn(): void { }

  rotationStyle(): React.CSSProperties {
    const rotation = () => {
      switch (this.direction) {
        case Direction.Up:
          return { transform: "rotate(0deg)" };
        case Direction.Down:
          return { transform: "rotate(180deg)" };
        case Direction.Left:
          return { transform: "rotate(270deg)" };
        case Direction.Right:
          return { transform: "rotate(90deg)" };
      }
    };
    return rotation();
  }

  leftDirection(): Direction {
    return leftDirection(this.direction);
  }

  rightDirection(): Direction {
    return rightDirection(this.direction);
  }

  backwardDirection(): Direction {
    return backwardDirection(this.direction);
  }

  render(): JSX.Element {
    return (
      <div style={this.rotationStyle()}>
        {this.game.t(this.name)} - {this.game.t(this.player)}
      </div>
    );
  }

  directionalDeltas(): {
    forward: Position;
    backward: Position;
    left: Position;
    right: Position;
  } {
    const forward = directionDeltas[this.direction];
    const backward =
      directionDeltas[
      this.direction === Direction.Up
        ? Direction.Down
        : this.direction === Direction.Down
          ? Direction.Up
          : this.direction === Direction.Left
            ? Direction.Right
            : Direction.Left
      ];
    const left = new Position(forward.y, -forward.x);
    const right = new Position(-forward.y, forward.x);
    return { forward, backward, left, right };
  }

  toString(): string {
    return `${this.game.t(this.direction)}${this.game.t(this.name)}(${this.position.x
      }, ${this.position.y})`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  revealCell(p: Position): boolean {
    return false;
  }

  simple(): SimplePiece {
    return {
      type: this.name,
      position: this.position.simple(),
      player: this.player,
      direction: this.direction,
    };
  }

  static fromSimple(game: GameModel, piece: SimplePiece): Piece {
    let r: Piece;
    switch (piece.type) {
      case "Fighter":
        r = new Fighter(
          piece.player,
          piece.direction,
          new Position(piece.position.x, piece.position.y)
        );
        break;
      case "AEW":
        r = new AEW(
          piece.player,
          piece.direction,
          new Position(piece.position.x, piece.position.y)
        );
        break;
      default:
        throw new Error("Unknown piece type: " + piece.type);
    }
    r.game = game;
    return r;
  }

  moveTowards(targetPosition: Position): {
    position: Position;
    direction: Direction;
  } {
    const moves = this.getPossibleMoves();
    let bestMove = moves[0];
    let bestDistance = this.game.width + this.game.height;
    for (const move of moves) {
      const distance = move.position.distance(targetPosition, move.direction);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMove = move;
      }
    }
    return bestMove;
  }

  killMoves(): Move[] {
    return [];
  }

  canDeploy(p: Position) {
    return p.y === this.game.height - 1;
  }
}

export class Fighter extends Piece {
  name = "Fighter";
  missileRange = 4;
  fired = false;

  onBeginOfTurn(): void {
    super.onBeginOfTurn();
    this.fired = false;
  }
  clone(): Piece {
    const clone = super.clone() as Fighter;
    clone.fired = this.fired;
    return clone;
  }

  fire(pieceDOM: DOMRect): void {
    // Destroy the first piece in the missle range
    let piece = null;
    let i = 1;
    let missilePosition: Position | null = null;
    const missilePositions = [];
    for (; i <= this.missileRange; i++) {
      const newMissilePosition = this.position.add(
        directionDeltas[this.direction],
        i
      );
      if (newMissilePosition.isOutOfBound(this.game.width, this.game.height)) {
        i -= 1;
        break;
      }
      missilePosition = newMissilePosition;
      missilePositions.push(missilePosition);
      piece = this.game.getPiece(missilePosition);
      if (piece !== null && piece.player === this.player) {
        break;
      }
    }
    const resps = this.game.client.send({
      type: "missile",
      positions: missilePositions,
      missileRange: this.missileRange,
      hasHit: piece != null,
    });
    if (resps.length > 0) {
      missilePosition = (resps[0] as DestroyPieceResponse<Position>).position;
      i = Math.min(i, missilePosition.distance(this.position));
    }
    this.moved = true;
    this.fired = true;
    if (missilePosition) {
      const duration = 1500 * (Math.min(i, this.missileRange) / this.missileRange);
      this.game.addAnimation((onEnd) => {
        const toX = pieceDOM.x + (missilePosition.x - this.position.x) * 50;
        const toY = pieceDOM.y + (missilePosition.y - this.position.y) * 50;
        return {
          node: <Missile
            key="missile"
            x={pieceDOM.x}
            y={pieceDOM.y}
            toX={toX}
            toY={toY}
            duration={duration}
            hasExplosion={piece != null || resps.length > 0}
            onEnd={onEnd}
          />,
          onEnd: () => { this.game.shotDown(missilePosition); },
        };
      });
    }
  }

  getActions(): [string, ActionCB, () => React.ReactNode][] {
    const actions: [string, ActionCB, () => React.ReactNode][] = [];
    if (!this.fired) {
      actions.push([
        "fire",
        this.fire,
        () => <MenuItem t={this.game.t} action="fire" icon={`${basePath}/big-red-button.jpg`} />,
      ]);
    }
    return actions;
  }

  getMoves(): { position: Position; direction: Direction }[] {
    const directionalDeltas = this.directionalDeltas();
    const availableMoves = [
      {
        position: this.position.add(directionalDeltas.forward),
        direction: this.direction,
      },
      {
        position: this.position.add(directionalDeltas.forward, 2),
        direction: this.direction,
      },
      {
        position: this.position
          .add(directionalDeltas.forward)
          .add(directionalDeltas.left),
        direction: this.leftDirection(),
      },
      {
        position: this.position
          .add(directionalDeltas.forward)
          .add(directionalDeltas.right),
        direction: this.rightDirection(),
      },
      {
        position: this.position,
        direction: this.leftDirection(),
      },
      {
        position: this.position,
        direction: this.rightDirection(),
      },
      {
        position: this.position,
        direction: this.backwardDirection(),
      },
      {
        position: this.position,
        direction: this.direction,
      },
    ].filter(
      ({ position: p }) =>
        !p.isOutOfBound(this.game.width, this.game.height) &&
        (this.game.getPiece(p) === null || // can move to empty cell
          p.equals(this.position) || // can stay in the same cell
          this.game.getPiece(p)?.player !== this.player) // can crash into enemy pieces
    );
    return availableMoves;
  }

  revealCell(p: Position): boolean {
    if (p.isOutOfBound(this.game.width, this.game.height)) {
      return false;
    }
    const distance = p.distance(this.position);
    return distance <= 1;
  }

  render(): JSX.Element {
    return (
      <Image
        style={this.rotationStyle()}
        src={`${basePath}/Fighter-${playerColor[this.player]}.png`}
        width={50}
        height={50}
        alt={this.game.t(this.name) + " - " + this.game.t(this.player)}
      />
    );
  }

  killMoves(): Move[] {
    const killMoves: Move[] = [];
    const moves = this.getPossibleMoves();
    for (const move of moves) {
      const pos = move.position;
      const targetPosPiece = this.game.getPiece(pos);
      if (targetPosPiece != null && targetPosPiece.player !== this.player) {
        // crash
        killMoves.push(new Move(this, move, [], targetPosPiece, 1));
        continue;
      }
      for (let i = 1; i <= this.missileRange; i++) {
        const newMissilePosition = pos.add(directionDeltas[move.direction], i);
        const piece = this.game.getPiece(newMissilePosition);
        if (piece != null) {
          if (piece.player !== this.player) {
            killMoves.push(new Move(this, move, ["fire"], piece));
          } else {
            break;
          }
        }
      }
    }
    return killMoves;
  }

  canDeploy(p: Position) {
    return p.y >= this.game.height - 2;
  }
}

export class AEW extends Piece {
  name = "AEW";
  radarRange = 4;

  getActions(): [string, () => void, () => React.ReactNode][] {
    return [];
  }

  getMoves(): { position: Position; direction: Direction }[] {
    const directionalDeltas = this.directionalDeltas();
    return [
      {
        position: this.position,
        direction: this.direction,
      },
      {
        position: this.position.add(directionalDeltas.forward),
        direction: this.direction,
      },
      {
        position: this.position,
        direction: this.leftDirection(),
      },
      {
        position: this.position,
        direction: this.rightDirection(),
      },
    ].filter(
      ({ position: p }) =>
        !p.isOutOfBound(this.game.width, this.game.height) &&
        (this.game.getPiece(p) === null || // can move to empty cell
          p.equals(this.position) || // can stay in the same cell
          this.game.getPiece(p)?.player !== this.player) // can crash into enemy pieces
    );
  }

  revealCell(p: Position): boolean {
    if (p.isOutOfBound(this.game.width, this.game.height)) {
      return false;
    }
    const distance = p.distance(this.position);
    return distance <= this.radarRange;
  }

  render(): JSX.Element {
    return (
      <Image
        style={this.rotationStyle()}
        src={`${basePath}/AEW-${playerColor[this.player]}.png`}
        width={50}
        height={50}
        alt={this.game.t(this.name) + " - " + this.game.t(this.player)}
      />
    );
  }
}

function emtpyBoard(width: number, height: number): (Piece | null)[][] {
  const pieces = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(null);
    }
    pieces.push(row);
  }
  return pieces;
}

let gameId = 0;

export class GameModel {
  public addAnimation: (
    animationMaker: (endCb: () => void) => { node: ReactNode, onEnd?: () => void }
  ) => void = () => { };
  public pieces: (Piece | null)[][] = [];
  public remote: GameRemote = null as unknown as GameRemote;
  public client: GameClient;
  public onClone: ((game: GameModel) => void)[] = [];
  public winState: string | null = null;
  public gameStarted = false;
  gameId = gameId++;
  constructor(
    public t: LocalizeFunc,
    public width: number,
    public height: number,
    public addLog: (
      kind: string,
      params: { [name: string]: Stringifyable } | null
    ) => void,
    public player: Player
  ) {
    this.pieces = emtpyBoard(width, height);
    this.client = new GameClient(this);
  }

  clone(): GameModel {
    const clone = new GameModel(
      this.t,
      this.width,
      this.height,
      this.addLog,
      this.player
    );
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let newPiece = null;
        if (this.pieces[y][x] !== null) {
          newPiece = (this.pieces[y][x] as Piece).clone();
          newPiece.game = clone;
        }
        clone.pieces[y][x] = newPiece || null;
      }
    }
    clone.remote = this.remote;
    clone.client = this.client;
    clone.client.game = clone;
    clone.onClone = this.onClone;
    clone.addAnimation = this.addAnimation;
    clone.winState = this.winState;
    clone.gameStarted = this.gameStarted;
    clone.onClone.forEach((f) => f(clone));
    return clone;
  }

  getPiece(p: Position): Piece | null {
    if (p.isOutOfBound(this.width, this.height)) {
      return null;
    }
    return this.pieces[p.y][p.x];
  }

  findOwnPiece(pred: (p: Piece, pos: Position) => boolean) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pos = new Position(x, y);
        const piece = this.getPiece(pos);
        if (piece && piece.player === this.player && pred(piece, pos)) {
          return piece;
        }
      }
    }
    return null;
  }

  findAllOwnPiece(pred: (p: Piece, pos: Position) => boolean) {
    const results = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pos = new Position(x, y);
        const piece = this.getPiece(pos);
        if (piece && piece.player === this.player && pred(piece, pos)) {
          results.push(piece);
        }
      }
    }
    return results;
  }

  findAllEnemyPiece(pred?: (p: Piece, pos: Position) => boolean) {
    const results = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pos = new Position(x, y);
        const piece = this.getPiece(pos);
        if (
          piece &&
          piece.player !== this.player &&
          (pred == null || pred(piece, pos))
        ) {
          results.push(piece);
        }
      }
    }
    return results;
  }

  addPiece(piece: Piece, p: Position): boolean {
    if (p.isOutOfBound(this.width, this.height)) {
      return false;
    }
    if (this.pieces[p.y][p.x] !== null) {
      return false;
    }
    this.pieces[p.y][p.x] = piece;
    piece.position = p;
    piece.game = this;
    return true;
  }

  removePiece(p: Position): boolean {
    if (p.isOutOfBound(this.width, this.height)) {
      return false;
    }
    if (this.pieces[p.y][p.x] === null) {
      return false;
    }
    this.pieces[p.y][p.x] = null;
    return true;
  }

  movePiece(from: Position, to: Position, direction: Direction): boolean {
    const piece = this.getPiece(from);
    if (piece === null) {
      return false;
    }
    if (!this.removePiece(from)) {
      return false;
    }
    piece.direction = direction;
    piece.moved = true;
    const moveSuccess = this.addPiece(piece, to);
    this.client.sendAndHandle({
      type: "move",
      from: from,
      to: to,
      piece: piece,
    });
    this.syncRevealedCells();
    return moveSuccess;
  }

  shotDown(p: Position): boolean {
    const piece = this.getPiece(p);
    if (piece === null) {
      return false;
    }
    const pieceRemoved = this.removePiece(p);
    this.addLog("shotDown", {
      x: p.x.toString(),
      y: p.y.toString(),
      piece: piece.name,
    });
    this.client.sendAndHandle({
      type: "destroy",
      position: p,
    });
    this.syncRevealedCells();
    this.checkWinLose();
    return pieceRemoved;
  }

  isInTerritory(position: Position, player: Player): boolean {
    if (player !== this.player) {
      return position.y < this.height / 2;
    } else {
      return position.y >= this.height / 2;
    }
  }

  isDeployable(piece: Piece, p: Position): boolean {
    return this.getPiece(p) === null && piece.canDeploy(p);
  }

  isFOW(p: Position): [false, string] | [true, null] {
    /**
     * Fog of war
     *
     * Every piece has its own radar range. Call "revealCell" to check if a cell is visible.
     * If there is any our piece in the enemy's AEW's range, the enemy's AEW is visible.
     * Otherwise, the cell is in fog of war.
     */
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const piece = this.getPiece(new Position(x, y));
        if (piece !== null && piece.player === this.player) {
          if (piece.revealCell(p)) {
            let reason = piece.name;
            if (piece instanceof AEW) {
              reason += ` ${JSON.stringify(piece.simple())}`;
            }
            return [false, reason];
          }
        }
      }
    }
    if (this.isInTerritory(p, this.player)) {
      return [false, "territory"];
    }
    // if this piece is enemy's AEW, it is visible if any of our piece is in its range
    const piece = this.getPiece(p);
    if (
      piece !== null &&
      piece.player !== this.player &&
      piece instanceof AEW
    ) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const ourPiece = this.getPiece(new Position(x, y));
          if (ourPiece !== null && ourPiece.player === this.player) {
            if (piece.revealCell(ourPiece.position)) {
              return [false, "enemy AEW"];
            }
          }
        }
      }
    }
    return [true, null];
  }

  isExposed(p: Position): boolean {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isFOW(new Position(x, y))[0]) {
          continue;
        }
        const piece = this.getPiece(new Position(x, y));
        if (piece !== null && piece.player !== this.player) {
          if (piece.revealCell(p)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  syncRevealedCells() {
    if (!this.gameStarted) {
      return; // do not send FOW info before the game starts.
    }
    const revealedCells: [Position, string][] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const [isFOW, FOWReason] = this.isFOW(new Position(x, y));
        if (!isFOW) {
          revealedCells.push([new Position(x, y), FOWReason]);
        }
      }
    }
    this.client.sendAndHandle({
      type: "reveal",
      cells: revealedCells,
    });
  }

  startTurn() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const piece = this.getPiece(new Position(x, y));
        if (piece !== null) {
          piece.onBeginOfTurn();
        }
      }
    }

    this.syncRevealedCells();
  }

  checkWinLose() {
    if (this.winState) {
      return true;
    }
    if (
      this.pieces
        .flat()
        .filter(
          (p) => p != null && p.player === this.player && !(p instanceof AEW)
        ).length === 0
    ) {
      this.winState = "lose";
      this.client.sendAndHandle({
        type: "lose",
      });
      return true;
    }
    return false;
  }

  startGame() {
    this.gameStarted = true;
  }

  getPieceDOM(position: Position): DOMRect {
    return {
      x: position.x * 50,
      y: position.y * 50,
      width: 50,
      height: 50,
    }
  }

  executeMove(move: Move) {
    const pieceDOM = this.getPieceDOM(move.piece.position);
    this.addLog("move", {
      piece: move.piece.name,
      x: move.piece.position.x,
      y: move.piece.position.y,
      toX: move.moveTo.position.x,
      toY: move.moveTo.position.y
    });
    this.movePiece(move.piece.position, move.moveTo.position, move.moveTo.direction);
    for (const action of move.actions) {
      if (action in move.piece) {
        const f = (move.piece as any)[action] as ActionCB;
        if (typeof f === "function") {
          this.addLog(action, {
            piece: move.piece.name,
            x: move.moveTo.position.x,
            y: move.moveTo.position.y
          });
          f.call(move.piece, pieceDOM);
          continue;
        } else {
          throw new Error(`Action ${action} is not a function`);
        }
      }
      throw new Error(`Unknown action ${action}`);
    }
  }
}
