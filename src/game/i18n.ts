export const i18n: { [key: string]: { [key: string]: string } } = {
  "en-US": {
    "ace-figher": "Ace Fighter",
    "vs-ai": "vs AI",
    "quick-match": "Quick Match",
    "hotseat": "Hotseat",
    "play-with-friend": "Play with Friend",
    "prepareDeploy": "Deployment begins: {player}",
    "Player1": "Player 1",
    "Player2": "Player 2",
    "startDeploy": "Deploy",
    "beforeTurn": "{player}'s Turn",
    "startTurn": "Start Turn",
    "turnAround": "({player} please turn around and not look)",
    "gameStart": "Game start",
    "deploy": "Deploy {player}'s {piece} to ({x}, {y})",
    "endTurn": "End Turn",
    "AEW": "AEW",
    "Fighter": "Fighter",
    "select": "Select {piece}({x}, {y})",
    "deselect": "Deselect {piece}({x}, {y})",
    "move": "Move {piece}({x}, {y}) to ({toX}, {toY})",
    "rotate": "Rotate {piece}({x}, {y}) from {direction} to {newDirection}",
    "Up": "↑",
    "Down": "↓",
    "Left": "←",
    "Right": "→",
    "fire": "Fire",
    "standby": "Standby",
    "shotDown": "Shot down {piece}({x}, {y})",
    "lose": "{player} Lost",
    "win": "{player} Won",
    "back-to-main-screen": "Back to Main Screen",
    "show-log": "Show log (debug)",
  },
  "zh-CN": {
    "ace-figher": "王牌战机",
    "vs-ai": "对战AI",
    "quick-match": "快速匹配",
    "hotseat": "本地双人",
    "play-with-friend": "与朋友联机",
    "prepareDeploy": "部署开始：{player}",
    "Player1": "玩家 1",
    "Player2": "玩家 2",
    "startDeploy": "部署",
    "beforeTurn": "{player}的回合",
    "startTurn": "开始回合",
    "turnAround": "({player}请不要看屏幕)",
    "gameStart": "游戏开始",
    "deploy": "部署{player}的{piece}到({x}, {y})",
    "endTurn": "结束回合（{player}）",
    "AEW": "预警机",
    "Fighter": "战斗机",
    "select": "选择 {piece}({x}, {y})",
    "deselect": "取消选择 {piece}({x}, {y})",
    "move": "移动 {piece}({x}, {y})到({toX}, {toY})",
    "rotate": "旋转 {piece}({x}, {y}) 从 {direction} 到 {newDirection}",
    "fire": "开火",
    "standby": "待机",
    "shotDown": "击落{piece}({x}, {y})",
    "lose": "{player} 输了",
    "win": "{player} 胜利",
    "back-to-main-screen": "返回主菜单",
    "show-log": "显示日志（调试用）",
  }
};

export interface Stringifyable {
  toString(): string;
}

export type LocalizeFunc = (
  kind: string,
  params?: { [name: string]: Stringifyable } | null
) => string;

export function getDefaultLanguage(window: Window) {
  if (window.localStorage.getItem("language")) {
    return window.localStorage.getItem("language") as string; // e.g. "zh" or "en"
  }
  let lang = navigator.language; // e.g. "zh-CN" or "en-US"
  if (i18n[lang] == null) {
    lang = "en-US"
  }
  return lang;
}

export function localize(
  lang: string,
  kind: string,
  params?: { [name: string]: Stringifyable } | null
): string {
  if (i18n[lang] == null) {
    lang = "en-US"
  }
  let templateString = i18n[lang][kind];
  if (templateString == null) {
    templateString = i18n["en-US"][kind];
    if (templateString == null) {
      return kind + (params ? " " + JSON.stringify(params) : "");
    }
  }
  if (params == null) {
    return templateString;
  }
  return templateString.replace(/{(\w+)}/g, (match, name: string) => {
    return params.hasOwnProperty(name) ? localize(lang, params[name].toString()) : `{${name}}`;
  });
}
