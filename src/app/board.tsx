import { GameModel, Piece, Player, Position } from "@/game/boardModel";
import PieceView, { CellState, CellStateType } from "./piece";
import { LocalizeFunc } from "@/game/i18n";
import React, { useReducer } from "react";

interface BoardProps {
  t: LocalizeFunc;
  width: number;
  height: number;
  game: GameModel;
  setGameModel: (game: GameModel) => void;
  log: LocalizeFunc;
  pieces: (Piece | null)[][];
  onCellClicked?: (position: Position) => void;
  checkTurnEnd?: (game: GameModel, player: Player) => void;
}

export default function Board({
  t,
  width,
  height,
  game,
  setGameModel,
  log,
  pieces,
  onCellClicked,
  checkTurnEnd,
}: BoardProps) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [states, setStates] = React.useState<CellState[]>(
    new Array(height * width).fill([CellStateType.Idle, null])
  );
  game.forceUpdate = forceUpdate;

  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const position = new Position(x, y);
      row.push(
        <PieceView
          t={t}
          key={`${x},${y}`}
          x={x}
          y={y}
          width={width}
          height={height}
          game={game}
          setGameModel={setGameModel}
          log={log}
          states={states}
          setStates={setStates}
          piece={pieces[y][x]}
          onClick={() => {
            if (onCellClicked) {
              onCellClicked(position);
            }
          }}
          checkTurnEnd={checkTurnEnd}
        ></PieceView>
      );
    }
    rows.push(
      <div key={y} className="row flex">
        {row}
      </div>
    );
  }
  return (
    <div>
      {rows}
    </div>
  );
}
