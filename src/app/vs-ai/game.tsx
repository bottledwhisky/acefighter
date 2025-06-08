"use client";
import Link from "next/link";
import Log from "../log";
import Board from "../board";
import { useState, ReactNode, useReducer, useRef } from "react";
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
import AI from "./ai";
import { CellState, CellStateType } from "../piece";

interface GameProps {
  width: number;
  height: number;
  t: LocalizeFunc;
}

let animationGlobalId = 0;
let pendingState: string | null = null;

export default function AIGame({ width, height, t }: GameProps) {
  const board = useRef<HTMLDivElement>(null);
  const boardStates = useRef<{
    resetStates: () => void;
  }>(null);
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
  const gameStateReact = useState<string>(`deploy-${Player.Player1}`);
  let gameState = gameStateReact[0];
  const _setGameState = gameStateReact[1];

  function setGameState(newState: string) {
    if (gameState !== newState) {
      addLog("state", { state: newState });
    }
    if (animations.length > 0) {
      pendingState = newState;
    } else {
      gameState = newState;
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
  const ai = useRef<AI>(null);
  if (ai.current === null) {
    ai.current = new AI(gameModels[1]);
  }
  const [hintText, setHintText] = useState<string | null>(null);

  gameModels[0].addAnimation = addAnimation.bind(null, gameState.endsWith("Player1"));
  gameModels[1].addAnimation = addAnimation.bind(null, gameState.endsWith("Player2"));
  function setGameModel(newGameModel: GameModel, player: Player) {
    setGameModels([
      player === Player.Player1 ? newGameModel : gameModels[0],
      player === Player.Player2 ? newGameModel : gameModels[1],
    ]);
    if ((player === Player.Player2 ? newGameModel : gameModels[1]).gameId != ai.current?.game.gameId) {
      debugger;
    }
  }

  const [overlays, setOverlays] = useState<{ id: string, node: ReactNode }[]>([]);

  function handleDeploy(self: Player) {
    if (
      gameState !== `deploy-${self}`
    ) {
      return {};
    }
    if (gameState === `deploy-${self}`) {
      if (!undeployedPieces.some((p) => p.player === self)) {
        if (self === Player.Player1) {
          setGameState("deploy-Player2");
        } else {
          addLog("gameStart");
          gameModels[0].startGame();
          gameModels[1].startGame();
          gameModels[1].syncRevealedCells();
          setGameState("before-turn-Player1");
        }
      }
    }

    if (self === Player.Player1) {
      const piece = undeployedPieces[0];
      piece.game = gameModels[0];
      function onCellClicked(p: Position) {
        const newGameModel = gameModels[0].clone();
        if (
          newGameModel.isDeployable(piece, p) &&
          newGameModel.addPiece(piece, p)
        ) {
          setUndeployedPieces(undeployedPieces.slice(1));
          setGameModel(newGameModel, self);
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
    } else {
      const newGameModel = gameModels[1].clone();
      for (const piece of undeployedPieces) {
        piece.game = newGameModel;
        const p = ai.current!.deploy(piece);
        newGameModel.addPiece(piece, p);
        addLog("deploy", {
          piece: piece.name,
          player: piece.player,
          x: p.x,
          y: p.y,
        });
      }
      setHintText(null);
      setGameModel(newGameModel, self);
      setUndeployedPieces([]);
      return {};
    }
  }

  function getAutoPopupStyle() {
    if (board.current) {
      const boardRect = board.current.getBoundingClientRect();
      const x = boardRect.left + boardRect.width / 2 - 110;
      const y = boardRect.top + boardRect.height / 2 - 60;
      return { left: `${x}px`, top: `${y}px`, width: "200px", height: "100px" };
    } else {
      return {}; // Default style if board is not available.
    }
  }

  function handleAITurn() {
    if (gameState === "turn-Player2") {
      setTimeout(() => {
        setGameState("turn-AI");
      }, 200); // Wait for 1 second.
      return true;
    } else if (gameState === "turn-AI") {
      const move = ai.current?.getMove();
      if (move) {
        const gameModel = gameModels[1]; // AI's game model.
        const game = gameModel.clone();
        game.executeMove(move);
        setGameModel(game, Player.Player2);
        if (game.checkWinLose()) {
          setGameState("game-over");
          return; // game over, do not end the turn.
        }
        setGameState("turn-Player2");
      } else {
        setGameState("before-turn-Player1"); // End the turn.
      }
      return true; // AI is handling the turn.
    }
    return false;
  }

  function handleBeforeTurn(self: Player) {
    if (!gameState.startsWith(`before-turn-${self}`)) {
      return false;
    }
    if (overlays.some((o) => o.id === "announcementBeforeTurn")) {
      return false; // already announced.
    }
    if (gameState === `before-turn-${self}-2`) {
      const gameModel = gameModels[self === Player.Player1 ? 0 : 1];
      const game = gameModel.clone();
      boardStates.current?.resetStates();
      game.startTurn();
      setGameModel(game, self);
      setGameState(`turn-${self}`);
      return true;
    }
    overlays.push({
      id: "announcementBeforeTurn",
      node: <div key="announcement" className="announcement auto-popup rollin rollout" style={getAutoPopupStyle()}>
        {t("beforeTurn", { player: self })}
      </div>
    });
    setOverlays(overlays.slice());
    setTimeout(() => {
      setGameState(`before-turn-${self}-2`);
      overlays.splice(overlays.findIndex((o) => o.id === "announcementBeforeTurn"));
      setOverlays(overlays.slice());
    }, 1500);
    return true;
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

  function handleWinLose(self: Player) {
    // When all Fighter pieces are destroyed, the game is over.
    const gameModel = gameModels[self === Player.Player1 ? 0 : 1];
    if (gameModel.winState) {
      return (
        <div key="announcement" className="announcement auto-popup rollin" style={getAutoPopupStyle()}>
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

  const { onCellClicked } = handleDeploy(Player.Player1);
  if (onCellClicked == null) {
    handleDeploy(Player.Player2);
  }
  if (animations.length === 0) {
    const handled = handleBeforeTurn(Player.Player1) ||
      handleBeforeTurn(Player.Player2) || handleAITurn();
    if (!handled && !overlays.some((o) => o.id === "winLose")) {
      const winLosePage = handleWinLose(Player.Player1) || handleWinLose(Player.Player2);
      if (winLosePage) {
        overlays.push({ id: "winLose", node: winLosePage });
        setOverlays(overlays.slice());
      }
    }
  }
  return (
    <div>
      <Board
        ref={board}
        states={states}
        setStates={setStates}
        t={t}
        width={width}
        height={height}
        game={gameModels[0]}
        setGameModel={(newGame) => setGameModel(newGame, Player.Player1)}
        log={addLog}
        pieces={gameModels[0].pieces}
        checkTurnEnd={checkTurnEnd}
        onCellClicked={onCellClicked}
      />
      {animations.map((animation) => animation.element)}
      {overlays.map((overlay) => overlay.node)}
      {gameState.startsWith("turn-Player1") ? <button
        className="button"
        type="button"
        onClick={() => {
          setStates(new Array(height * width).fill([CellStateType.Idle, null]));
          setGameState(
            `before-turn-${Player.Player2}`
          );
        }}
      >
        {t("endTurn")}
      </button> : gameState.startsWith("turn-Player2") || gameState.startsWith("turn-AI") ? <button
        className="button"
        type="button"
        disabled={true}
      >
        {t("AITakingTurn")}
      </button> : null}
      <div className="hint">{hintText && t(hintText)}</div>
      <Log key="log" showLog={showLog} setShowLog={setShowLog} t={t} logs={logs}></Log>
    </div>
  );
}
