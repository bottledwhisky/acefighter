import {
  AEW,
  Move,
  Fighter,
  GameModel,
  Position,
  Piece,
} from "@/game/boardModel";

export default class AI {
  constructor(public game: GameModel) {
    game.onClone.push((newGame) => {
      this.game = newGame;
    });
  }

  randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  getThreathen(piece: Piece) {
    if (piece.killMoves().length > 0) {
      return 100;
    }
    if (piece instanceof AEW) {
      return 2;
    }
    if (piece instanceof Fighter) {
      return 1;
    }
    return 100;
  }

  getFOWMassCenter(): Position {
    let accPos = new Position(0, 0);
    let count = 0;
    for (let y = 0; y < this.game.height; y++) {
      for (let x = 0; x < this.game.width; x++) {
        const pos = new Position(x, y);
        if (this.game.isFOW(pos)) {
          count++;
          accPos = accPos.add(pos);
        }
      }
    }
    return new Position(accPos.x / count, accPos.y / count);
  }

  getMove() {
    // if a fighter can kill, let it kill
    const allMoves: Move[] = [];
    for (let y = 0; y < this.game.height; y++) {
      for (let x = 0; x < this.game.width; x++) {
        const piece = this.game.getPiece(new Position(x, y));
        if (
          piece != null &&
          piece.player === this.game.player &&
          piece instanceof Fighter &&
          !piece.fired
        ) {
          const killingMoves = piece.killMoves();
          if (killingMoves) {
            allMoves.push(...killingMoves);
          }
        }
      }
    }
    // if there are multiple kills possible, kill the most threatning one
    if (allMoves.length > 0) {
      let threaten = 0;
      let mostValuableKills: Move[] = [];
      for (const move of allMoves) {
        const threat = this.getThreathen(move.killTarget!);
        if (threat > threaten) {
          threaten = threat;
          mostValuableKills = [move];
        } else if (threat === threaten) {
          mostValuableKills.push(move);
        }
      }
      return this.randomChoice(mostValuableKills);
    }
    // move AEW towards more unvealed cells
    const AEWs = this.game.findAllOwnPiece(
      (piece) => piece instanceof AEW && !piece.moved
    ) as AEW[];
    if (AEWs.length > 0) {
      const fowCenter = this.getFOWMassCenter();
      for (const aew of AEWs) {
        allMoves.push(new Move(aew, aew.moveTowards(fowCenter), []));
      }
      return this.randomChoice(allMoves);
    }
    // move fighters towards enemy
    const fighters = this.game.findAllOwnPiece(
      (piece) => piece instanceof Fighter && !piece.moved
    );
    const allEnemyPieces = this.game.findAllEnemyPiece();
    if (fighters.length > 0 && allEnemyPieces.length > 0) {
      for (const fighter of fighters) {
        let bestDistance = this.game.width + this.game.height;
        let toEnemy = allEnemyPieces[0];
        for (const enemy of allEnemyPieces) {
          const distance = fighter.position.distance(enemy.position);
          if (distance < bestDistance) {
            bestDistance = distance;
            toEnemy = enemy;
          }
        }
        allMoves.push(
          new Move(fighter, fighter.moveTowards(toEnemy.position), [])
        );
      }
      return this.randomChoice(allMoves);
    }
    // move fighers towards more unvealed cells
    const fowCenter = this.getFOWMassCenter();
    for (const fighter of fighters) {
      allMoves.push(new Move(fighter, fighter.moveTowards(fowCenter), []));
    }
  }
}
