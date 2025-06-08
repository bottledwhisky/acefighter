import {
  Direction,
  GameModel,
  Piece,
  Player,
  Position,
} from "@/game/boardModel";
import { LocalizeFunc } from "@/game/i18n";
import React, { useReducer } from "react";
import MenuItem from "./MenuItem";
import { basePath } from "@/config";

export interface CellStateData {
  movablePiecePreview?: Piece | null;
  movableRotations?: Direction[];
  moveFrom?: Position | null;
}

export enum CellStateType {
  Idle = "idle",
  Selected = "selected",
  Movable = "movable",
  AfterMove = "after-move",
}

export type CellState = [CellStateType, CellStateData | null];

interface PieceProps {
  t: LocalizeFunc;
  piece: Piece | null;
  x: number;
  y: number;
  width: number;
  height: number;
  game: GameModel;
  setGameModel: (game: GameModel) => void;
  log: LocalizeFunc;
  states: CellState[];
  setStates: (states: CellState[]) => void;
  onClick?: (piece: Piece | null) => void;
  checkTurnEnd?: (game: GameModel, player: Player) => void;
}
export default function PieceView({
  t,
  log,
  x,
  y,
  width,
  game,
  setGameModel,
  piece,
  states,
  setStates,
  onClick,
  checkTurnEnd,
}: PieceProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  let className = "cell";
  const state = states[y * width + x];
  let stateType = state[0];
  const data = state[1];
  function setState(
    states: CellState[],
    state: CellStateType,
    position: Position | number | null = null,
    data: CellStateData | null = null
  ) {
    const idx =
      typeof position === "object" && position !== null && "x" in position && "y" in position
        ? position.y * width + position.x
        : position === null
          ? y * width + x
          : position;
    states[idx] = [state, data || null];
  }
  function unselect(newStates: CellState[]) {
    states.forEach(([state], idx) => {
      if (state === CellStateType.Selected || state === CellStateType.Movable || state === CellStateType.AfterMove) {
        setState(newStates, CellStateType.Idle, idx, null);
      }
    });
  }
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  if (piece != null && piece.player === game.player) {
    if (stateType === CellStateType.Idle) {
      onClick = (piece) => {
        piece = piece as Piece;
        if (piece.moved && piece.getActions().length === 0) {
          return;
        }
        const newStates = [...states];
        unselect(newStates);
        setState(newStates, CellStateType.Selected);
        if (!piece.moved) {
          for (const { position, direction } of piece.getPossibleMoves()) {
            const previewPiece = piece.clone();
            previewPiece.position = position;
            previewPiece.direction = direction;
            if (position != piece.position) {
              setState(newStates, CellStateType.Movable, position, {
                movablePiecePreview: previewPiece,
                moveFrom: piece.position,
              });
            } else {
              setState(newStates, CellStateType.Selected, position, {
                movableRotations: (
                  newStates[y * width + x][1]?.movableRotations || []
                ).concat(direction),
              });
            }
          }
        }
        setStates(newStates);
        log("select", { piece: piece.name, x: piece.position.x, y: piece.position.y });
      };
    } else if (stateType === CellStateType.Selected) {
      onClick = (piece) => {
        const newStates = [...states];
        unselect(newStates);
        setStates(newStates);
        if (piece) {
          log("deselect", { piece: piece.name, x: piece.position.x, y: piece.position.y });
        }
      };
    }
  }
  if (stateType === CellStateType.Movable) {
    const targetPiece = data?.movablePiecePreview as Piece;
    onClick = () => {
      const newStates = [...states];
      unselect(newStates);
      game = game.clone();
      const fromPiece = game.getPiece(
        (data as CellStateData).moveFrom as Position
      ) as Piece;
      fromPiece.move(targetPiece.position, targetPiece.direction);
      setGameModel(game);
      setState(newStates, CellStateType.AfterMove, targetPiece.position);
      setStates(newStates);
      log("move", {
        piece: fromPiece.name,
        x: fromPiece.position.x,
        y: fromPiece.position.y,
        toX: targetPiece.position.x,
        toY: targetPiece.position.y,
      });
      if (checkTurnEnd) {
        checkTurnEnd(game, fromPiece.player);
      }
    };
  }
  if (stateType === CellStateType.Movable) {
    className += " movable";
  }
  if (stateType === CellStateType.Selected) {
    className += " selected";
  }
  let idleIndicatorClassName = "idle-indicator";
  let idleIndicatorStyle: React.CSSProperties = {
    opacity: 0,
  };
  if (piece != null && piece.player === game.player) {
    if (piece.moved) {
      idleIndicatorClassName += " moved";
    } else {
      idleIndicatorClassName += " not-moved";
    }
    if (piece.getActions().length === 0) {
      idleIndicatorClassName += " no-action";
    } else {
      idleIndicatorClassName += " has-action";
    }
    idleIndicatorStyle = {
      opacity: 1,
    };
  }
  let movablePiecePreviewRender = null;
  const boundingClientRect =
    ref.current != null
      ? ref.current.getBoundingClientRect()
      : { x: 0, y: 0, width: 0, height: 0 };

  if (ref.current == null) {
    setTimeout(() => {
      if (ref.current) {
        forceUpdate();
      }
    });
  }

  const actionMenu: React.ReactNode[] = [];

  const top = boundingClientRect.y;
  const left = boundingClientRect.x;

  if (stateType === CellStateType.Selected &&
    piece != null &&
    piece.player === game.player && piece.moved && piece.getActions().length > 0) {
    stateType = CellStateType.AfterMove;
  }

  if (
    stateType === CellStateType.AfterMove &&
    piece != null &&
    piece.player === game.player
  ) {
    const actions = piece.getActions();
    for (const [action, cb, render] of actions) {
      actionMenu.push(
        <div
          className="action"
          key={action}
          onClick={() => {
            const newGame = game.clone();
            const newPiece = newGame.getPiece(
              piece.position as Position
            ) as Piece;
            cb.bind(newPiece)(boundingClientRect);
            if (newPiece.moved) {
              const newStates = [...states];
              unselect(newStates);
              if (newPiece.getActions().length > 0) {
                setState(newStates, CellStateType.Selected, newPiece.position);
              }
              setStates(newStates);
            }
            if (checkTurnEnd) {
              checkTurnEnd(newGame, newPiece.player);
            }
            setGameModel(newGame);
          }}
        >
          {render()}
        </div>
      );
    }
    if (actionMenu.length > 0) {
      actionMenu.push(
        <div
          className="action"
          key="standby"
          onClick={(e) => {
            const newGame = game.clone();
            const newPiece = newGame.getPiece(
              piece?.position as Position
            ) as Piece;
            newPiece.moved = true;
            if (checkTurnEnd) {
              checkTurnEnd(newGame, newPiece.player);
            }
            const newStates = [...states];
            unselect(newStates);
            setStates(newStates);
            setGameModel(newGame);
            e.stopPropagation();
            log("standby", { piece: piece.toString() });
          }}
        >
          <MenuItem t={t} action="standby" icon={`${basePath}/hourglass.png`} />
        </div>
      );
    }
  }

  if (
    stateType === CellStateType.Movable &&
    data?.movablePiecePreview !== null
  ) {
    movablePiecePreviewRender = (
      <div
        className="piece movable-preview"
        style={{ position: "absolute", left, top }}
      >
        {data?.movablePiecePreview?.render()}
      </div>
    );
  } else if (data?.movableRotations !== null) {
    // show rotate icons
    movablePiecePreviewRender = [];
    for (const direction of data?.movableRotations || []) {
      let turnArrowClassName = "turn-arrow";
      let left = 0;
      let top = 0;
      // if (direction !== piece?.direction) {
      switch (direction) {
        case Direction.Up:
          turnArrowClassName += " up";
          left = boundingClientRect.x + boundingClientRect.width / 2 - 8;
          top = boundingClientRect.y - 8;
          break;
        case Direction.Down:
          turnArrowClassName += " down";
          left = boundingClientRect.x + boundingClientRect.width / 2 - 8;
          top = boundingClientRect.y + boundingClientRect.height - 8;
          break;
        case Direction.Left:
          turnArrowClassName += " left";
          left = boundingClientRect.x - 8;
          top = boundingClientRect.y + boundingClientRect.height / 2 - 8;
          break;
        case Direction.Right:
          turnArrowClassName += " right";
          left = boundingClientRect.x + boundingClientRect.width - 8;
          top = boundingClientRect.y + boundingClientRect.height / 2 - 8;
          break;
      }
      movablePiecePreviewRender.push(
        <div
          className={turnArrowClassName}
          style={{ position: "absolute", left, top }}
          key={direction}
          onClick={(e) => {
            const newGame = game.clone();
            const newPiece = newGame.getPiece(
              piece?.position as Position
            ) as Piece;
            const oldDirection = newPiece.direction;
            newPiece.move(newPiece.position, direction);
            if (checkTurnEnd) {
              checkTurnEnd(newGame, newPiece.player);
            }
            const newStates = [...states];
            unselect(newStates);
            setState(newStates, CellStateType.Selected, newPiece.position);
            setStates(newStates);
            setGameModel(newGame);
            e.stopPropagation();
            log("rotate", {
              piece: newPiece.name,
              x: newPiece.position.x, y: newPiece.position.y, direction, newDirection: oldDirection
            });
          }}
        ></div>
      );
    }
  }

  const isFOW = game.isFOW(new Position(x, y))[0];
  if (isFOW) {
    className += " fow";
  }

  if (game.isExposed(new Position(x, y))) {
    className += " exposed";
  }

  return (
    <div
      ref={ref}
      className={className}
      onClick={() => {
        if (onClick) {
          onClick(piece);
        }
      }}
    >
      <div className={idleIndicatorClassName} style={idleIndicatorStyle}></div>
      {actionMenu.length > 0 ? (
        <div
          className="action-menu"
          style={{ top: top, left: left + 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          {actionMenu}
        </div>
      ) : null}
      {movablePiecePreviewRender}
      <div className="piece" style={{ position: "absolute", top, left, display: ref.current == null ? "none" : "block" }}>
        {piece !== null
          ? piece.player === game.player
            ? piece.render()
            : isFOW
              ? null
              : piece.render()
          : null}
      </div>
    </div>
  );
}
