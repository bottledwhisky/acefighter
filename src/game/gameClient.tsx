import Missile from "@/app/animations/missile";
import {
  AEW,
  backwardDirection,
  Direction,
  GameModel,
  Piece,
  Player,
  Position,
} from "./boardModel";

export type SimplePosition = { x: number; y: number };
export type SimplePiece = {
  type: string;
  player: Player;
  direction: Direction;
  position: SimplePosition;
};

export interface RevealCellEvent<T extends SimplePosition> {
  type: "reveal";
  cells: [T, string][];
}

export interface MoveEvent<
  T extends SimplePosition,
  P extends SimplePiece | Piece
> {
  type: "move";
  piece: P;
  from: T;
  to: T;
}

export interface DestroyPieceEvent<T extends SimplePosition> {
  type: "destroy";
  position: T;
}

export interface MissileEvent<T extends SimplePosition> {
  type: "missile";
  positions: T[];
  missileRange: number;
  hasHit: boolean;
}

export interface LoseEvent {
  type: "lose";
}

export type GameEvent<
  T extends SimplePosition,
  P extends SimplePiece | Piece
> =
  | RevealCellEvent<T>
  | MoveEvent<T, P>
  | DestroyPieceEvent<T>
  | MissileEvent<T>
  | LoseEvent;

export interface RevealPieceResponse<P extends SimplePiece | Piece> {
  type: "reveal";
  piece: P;
}

export interface DestroyPieceResponse<T extends SimplePosition> {
  type: "destroy";
  position: T;
}
export type GameEventResponse<
  T extends SimplePosition,
  P extends SimplePiece | Piece
> = RevealPieceResponse<P> | DestroyPieceResponse<T>;

export class GameClient {
  constructor(public game: GameModel) { }

  translatePosition(p: SimplePosition): Position {
    // rotate the position by 180 degrees
    return new Position(p.x, p.y).rotate(this.game.width, this.game.height);
  }

  translateEvent(
    event: GameEvent<SimplePosition, SimplePiece>
  ): GameEvent<Position, Piece> {
    if (event.type === "reveal") {
      return {
        type: "reveal",
        cells: event.cells.map(([position, reason]) => [
          this.translatePosition(position),
          reason,
        ]),
      };
    } else if (event.type === "move") {
      return {
        type: "move",
        piece: Piece.fromSimple(this.game, {
          ...event.piece,
          direction: backwardDirection(event.piece.direction),
          position: this.translatePosition(event.piece.position),
        }),
        from: this.translatePosition(event.from),
        to: this.translatePosition(event.to),
      };
    } else if (event.type === "destroy") {
      return {
        type: "destroy",
        position: this.translatePosition(event.position),
      };
    } else if (event.type === "missile") {
      return {
        type: "missile",
        positions: event.positions.map((position) =>
          this.translatePosition(position)
        ),
        missileRange: event.missileRange,
        hasHit: event.hasHit,
      };
    } else {
      return event;
    }
  }

  simplifyEvent(
    event: GameEvent<Position, Piece>
  ): GameEvent<SimplePosition, SimplePiece> {
    if (event.type === "reveal") {
      return { type: "reveal", cells: event.cells };
    } else if (event.type === "move") {
      return {
        type: "move",
        piece: event.piece.simple(),
        from: event.from,
        to: event.to,
      };
    } else if (event.type === "destroy") {
      return { type: "destroy", position: event.position.simple() };
    } else if (event.type === "missile") {
      return {
        type: "missile",
        positions: event.positions.map((p) => p.simple()),
        missileRange: event.missileRange,
        hasHit: event.hasHit,
      };
    } else {
      return event;
    }
  }
  translatePiece(piece: SimplePiece): Piece {
    return Piece.fromSimple(this.game, {
      ...piece,
      direction: backwardDirection(piece.direction),
      position: this.translatePosition(piece.position),
    });
  }

  translate(
    responses: GameEventResponse<SimplePosition, SimplePiece>[]
  ): GameEventResponse<Position, Piece>[] {
    return responses.map((response) => {
      if (response.type === "reveal") {
        return {
          type: "reveal",
          piece: this.translatePiece(response.piece),
        };
      } else if (response.type === "destroy") {
        return {
          type: "destroy",
          position: this.translatePosition(response.position),
        };
      } else {
        throw new Error("Unknown response type");
      }
    });
  }

  simplify(
    responses: GameEventResponse<Position, Piece>[]
  ): GameEventResponse<SimplePosition, SimplePiece>[] {
    return responses.map((response) => {
      if (response.type === "reveal") {
        return { type: "reveal", piece: response.piece.simple() };
      } else if (response.type === "destroy") {
        return { type: "destroy", position: response.position.simple() };
      } else {
        throw new Error("Unknown response type");
      }
    });
  }

  handle(
    rawEvent: GameEvent<SimplePosition, SimplePiece>
  ): GameEventResponse<SimplePosition, SimplePiece>[] {
    const event = this.translateEvent(rawEvent) as GameEvent<Position, Piece>;
    const responses: GameEventResponse<Position, Piece>[] = [];
    if (event.type === "reveal") {
      for (const [cell, reason] of event.cells) {
        const piece = this.game.getPiece(cell);
        if (piece && piece.player === this.game.player) {
          responses.push({ type: "reveal", piece });
        }
        if (reason.startsWith("AEW")) {
          const aewSimple = JSON.parse(reason.substring(4)) as SimplePiece;
          const aew = this.translatePiece(aewSimple);
          this.game.addPiece(aew, aew.position);
        }
      }
    } else if (event.type === "move") {
      const pieceFrom = this.game.getPiece(event.from);
      if (pieceFrom) {
        this.game.removePiece(event.from);
      }
      const [isFOW] = this.game.isFOW(event.to);
      if (!isFOW) {
        // if the cell is emtpy, place it
        const piece = this.game.getPiece(event.to);
        if (piece == null) {
          this.game.addPiece(event.piece, event.to);
          // if the cell is revealed by our AEW, reveal AEW
          const aews = this.game.pieces
            .flat()
            .filter(
              (p) =>
                p != null &&
                p instanceof AEW &&
                p.player === this.game.player &&
                p.revealCell(event.to)
            );
          for (const aew of aews) {
            responses.push({ type: "reveal", piece: aew as AEW });
          }
        }
        // if the cell is occupied by our piece, destroy both
        else if (piece.player === this.game.player) {
          this.game.shotDown(event.to);
          responses.push({
            type: "destroy",
            position: event.to,
          });
          responses.push({
            type: "destroy",
            position: event.from,
          });
        }
      }
    } else if (event.type === "destroy") {
      this.game.shotDown(event.position);
    } else if (event.type === "missile") {
      if (event.positions.length > 0) {
        let lastPosition = event.positions[0];
        let i = 0;
        for (const position of event.positions) {
          lastPosition = position;
          i++;
          const piece = this.game.getPiece(position);
          if (piece) {
            responses.push({ type: "destroy", position });
            break;
          }
        }
        this.game.addAnimation((onEnd) => {
          return {
            node: <Missile
              key="missile"
              x={event.positions[0].x * 50}
              y={event.positions[0].y * 50}
              toX={
                event.positions[0].x +
                (lastPosition.x - event.positions[0].x) * 50
              }
              toY={
                event.positions[0].y +
                (lastPosition.y - event.positions[0].y) * 50
              }
              duration={
                1500 * (Math.min(i, event.missileRange) / event.missileRange)
              }
              hasExplosion={event.hasHit || responses.length > 0}
              onEnd={onEnd}
            />,
            onEnd: () => {
              this.game.removePiece(lastPosition);
              this.game.syncRevealedCells();
              this.game.checkWinLose();
            },
          };
        });
      }
    } else if (event.type === "lose") {
      // you win
      this.game.winState = "win";
    }

    return this.simplify(responses);
  }

  sendAndHandle(
    event: GameEvent<Position, Piece>
  ): GameEventResponse<Position, Piece>[] {
    const responses = this.translate(
      this.game.remote.send(this.simplifyEvent(event))
    );
    this.handleResponses(responses);
    return responses;
  }

  handleResponses(responses: GameEventResponse<Position, Piece>[]) {
    for (const response of responses) {
      if (response.type === "reveal") {
        this.game.addPiece(response.piece, response.piece.position);
      } else if (response.type === "destroy") {
        this.game.removePiece(response.position);
      }
    }
  }

  send(
    event: GameEvent<Position, Piece>
  ): GameEventResponse<Position, Piece>[] {
    const responses = this.translate(
      this.game.remote.send(this.simplifyEvent(event))
    );
    return responses;
  }
}

export abstract class GameRemote {
  abstract send(
    event: GameEvent<SimplePosition, SimplePiece>
  ): GameEventResponse<SimplePosition, SimplePiece>[];
}

export class HotSeatGameRemote extends GameRemote {
  constructor(public otherGame: GameModel) {
    super();
    otherGame.onClone.push((newGame) => {
      this.otherGame = newGame;
    });
  }

  send(
    event: GameEvent<SimplePosition, SimplePiece>
  ): GameEventResponse<SimplePosition, SimplePiece>[] {
    return this.otherGame.client.handle(event);
  }
}
