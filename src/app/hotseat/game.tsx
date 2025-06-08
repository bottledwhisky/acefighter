"use client";
import Link from "next/link";
import Log from "../log";
import Board from "../board";
import { useState, ReactNode, useReducer } from "react";
import { LocalizeFunc, Stringifyable } from "@/game/i18n";
import {
  Direction,
  Fighter,
  Piece,
  Player,
  AEW,
  GameModel,
  Position,
} from "@/game/boardModel";
import { HotSeatGameRemote } from "@/game/gameClient";
import { CellState, CellStateType } from "../piece";

interface GameProps {
  width: number;
  height: number;
  t: LocalizeFunc;
}

let animationGlobalId = 0;
let pendingState: string | null = null;

export default function HotSeatGame({ width, height, t }: GameProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [states, setStates] = useState<CellState[]>(
    new Array(height * width).fill([CellStateType.Idle, null])
  );
  const [animations, setAnimations] = useState<
    {
      id: number;
      element: ReactNode;
    }[]
  >([]);

  function removeAnimation(id: number) {
    const newAnimations = animations.filter((animation) => animation.id !== id);
    setAnimations(newAnimations);
    if (newAnimations.length === 0) {
      if (pendingState) {
        console.log("pendingState", pendingState);
        _setGameState(pendingState);
        pendingState = null;
      } else {
        forceUpdate();
      }
    }
  }

  function addAnimation(
    show: boolean,
    animationMaker: (endCb: () => void) => { node: ReactNode, onEnd?: () => void }
  ) {
    animationGlobalId++;
    let onEnd: (() => void) | null | undefined = null;
    let onEndWasNull = false;
    function endCb() {
      removeAnimation(animationGlobalId);
      if (onEnd) {
        onEnd();
      } else {
        onEndWasNull = true;
      }
    }
    const r = animationMaker(endCb);
    const node = r.node;
    onEnd = r.onEnd;
    if (onEndWasNull && onEnd) {
      onEnd();
    }
    if (show) {
      const animation = {
        id: animationGlobalId,
        element: node,
      };
      animations.push(animation);
      setAnimations(animations.slice());
    } else if (onEnd) {
      onEnd();
    }
  }

  const [showLog, setShowLog] = useState<boolean>(false);
  const [gameState, _setGameState] = useState<string>(`prepare-deploy-${Player.Player1}`);

  function setGameState(newState: string) {
    if (animations.length > 0) {
      pendingState = newState;
    } else {
      _setGameState(newState);
    }
  }

  const [undeployedPieces, setUndeployedPieces] = useState<Piece[]>([
    new AEW(Player.Player1, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player1, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player1, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player1, Direction.Up, new Position(-1, -1)),
    new AEW(Player.Player2, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player2, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player2, Direction.Up, new Position(-1, -1)),
    new Fighter(Player.Player2, Direction.Up, new Position(-1, -1)),
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  function addLog(
    kind: string,
    params: { [name: string]: Stringifyable } | null = null
  ) {
    const log = t(kind, params);
    logs.push(log);
    const newLogs = logs.slice();
    setLogs(newLogs);
    console.log(log);
    return log;
  }
  const gameModelsReact = useState<GameModel[]>([]);
  let gameModels = gameModelsReact[0];
  const setGameModels = gameModelsReact[1];
  if (gameModels.length === 0) {
    gameModels = [
      new GameModel(t, width, height, addLog, Player.Player1),
      new GameModel(t, width, height, addLog, Player.Player2),
    ];
    gameModels[0].remote = new HotSeatGameRemote(gameModels[1]);
    gameModels[1].remote = new HotSeatGameRemote(gameModels[0]);
    setGameModels(gameModels);
  }
  gameModels[0].addLog = addLog;
  gameModels[1].addLog = addLog;
  const [hintText, setHintText] = useState<string | null>(null);

  const gameModel = gameState.endsWith("Player1")
    ? gameModels[0]
    : gameModels[1];
  gameModels[0].addAnimation = addAnimation.bind(null, gameState.endsWith("Player1"));
  gameModels[1].addAnimation = addAnimation.bind(null, gameState.endsWith("Player2"));
  const otherPlayer = (self: Player) => self === Player.Player1 ? Player.Player2 : Player.Player1;
  function setGameModel(newGameModel: GameModel) {
    setGameModels([
      gameState.endsWith("Player1") ? newGameModel : gameModels[0],
      gameState.endsWith("Player2") ? newGameModel : gameModels[1],
    ]);
  }

  function handleDeploy(self: Player) {
    if (
      gameState !== `prepare-deploy-${self}` &&
      gameState !== `deploy-${self}`
    ) {
      return {};
    }
    if (gameState === `prepare-deploy-${self}`) {
      return {
        e: (
          <div className="announcement">
            {t("prepareDeploy", { player: self })}
            <br />
            {t("turnAround", { player: otherPlayer(self) })}
            <button
              type="button"
              onClick={() => {
                setGameState(`deploy-${self}`);
              }}
            >
              {t("startDeploy")}
            </button>
          </div>
        )
      };
    }
    if (gameState === `deploy-${self}`) {
      if (!undeployedPieces.some((p) => p.player === self)) {
        if (self === Player.Player1) {
          setGameState("prepare-deploy-Player2");
        } else {
          addLog("gameStart");
          gameModels[0].startGame();
          gameModels[1].startGame();
          gameModels[1].syncRevealedCells();
          setGameState("before-turn-Player1");
          return {};
        }
      }
    }
    const piece = undeployedPieces[0];
    piece.game = gameModels[0];

    function onCellClicked(p: Position) {
      const newGameModel = gameModel.clone();
      if (
        newGameModel.isDeployable(piece, p) &&
        newGameModel.addPiece(piece, p)
      ) {
        setUndeployedPieces(undeployedPieces.slice(1));
        setGameModel(newGameModel);
        setHintText(null);
        addLog("deploy", {
          piece: piece.name,
          player: piece.player,
          x: p.x,
          y: p.y,
        });
      } else {
        setHintText("invalidPosition");
      }
    }
    return { onCellClicked };
  }

  function handleBeforeTurn(self: Player) {
    if (gameState !== `before-turn-${self}`) {
      return null;
    }
    return (
      <div className="announcement">
        {t("beforeTurn", { player: self })}
        <br />
        {t("turnAround", { player: otherPlayer(self) })}
        <button
          type="button"
          onClick={() => {
            const game = gameModel.clone();
            game.startTurn();
            setGameModel(game);
            setGameState(`turn-${self}`);
          }}
        >
          {t("startTurn")}
        </button>
      </div>
    );
  }

  function checkTurnEnd(game: GameModel, self: Player) {
    // When all pieces are moved, end the turn.
    if (gameState !== `turn-${self}`) {
      return null;
    }
    if (game.checkWinLose()) {
      setGameState("game-over");
      return; // game over, do not end the turn.
    }
    if (
      game.pieces
        .flat()
        .filter((p) => p != null && p.player === self)
        .every((p) => (p as Piece).moved && (p as Piece).getActions().length === 0)
    ) {
      setGameState(
        `before-turn-${self === Player.Player1 ? Player.Player2 : Player.Player1
        }`
      );
    }
  }

  function handleWinLose() {
    // When all Fighter pieces are destroyed, the game is over.
    if (gameModel.winState) {
      return (
        <div className="announcement">
          {t(gameModel.winState, { player: gameModel.player })}
          <Link
            href="/"
          >
            {t("back-to-main-screen")}
          </Link>
        </div>
      );
    }
  }

  const r = handleDeploy(Player.Player1);
  if (r.e) return r.e;
  let onCellClicked = r.onCellClicked;
  if (onCellClicked == null) {
    const r = handleDeploy(Player.Player2);
    if (r.e) return r.e;
    onCellClicked = r.onCellClicked;
  }

  return (
    (animations.length === 0 &&
      (handleBeforeTurn(Player.Player1) ||
        handleBeforeTurn(Player.Player2) ||
        handleWinLose())) || (
      <div>
        <Board
          t={t}
          states={states}
          setStates={setStates}
          width={width}
          height={height}
          game={gameModel}
          setGameModel={setGameModel}
          log={addLog}
          pieces={gameModel.pieces}
          checkTurnEnd={checkTurnEnd}
          onCellClicked={onCellClicked}
        ></Board>
        {animations.map((animation) => animation.element)}
        {gameState.startsWith("turn-") ? <button
          className="button"
          type="button"
          onClick={() => {
            setGameState(
              `before-turn-${gameModel.player === Player.Player1
                ? Player.Player2
                : Player.Player1
              }`
            );
          }}
        >
          {t("endTurn")}
        </button> : null}
        <div className="hint">{hintText && t(hintText)}</div>
        <Log key="log" showLog={showLog} setShowLog={setShowLog} t={t} logs={logs}></Log>
      </div>
    )
  );
}
