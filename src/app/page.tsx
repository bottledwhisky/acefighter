"use client"
import { getDefaultLanguage, localize, Stringifyable } from "@/game/i18n";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { basePath } from "@/config";

export default function Home() {
  const localeReact = useState<string | null>(null);
  let locale = localeReact[0];
  const setLocale = localeReact[1];
  useEffect(() => {
    if (locale == null) {
      changeLocale(getDefaultLanguage(window));
    }
  });
  const changeLocale = (newLocale: string) => {
    setLocale(newLocale);
    locale = newLocale;

    window.localStorage.setItem("language", newLocale);
  };

  function t(kind: string,
    params: { [name: string]: Stringifyable } | null = null) {
    return localize(locale || "en-US", kind, params);
  }

  return [
    <header key="header" className="locale-selector">
      <Image
        src={`${basePath}/locale-us.png`}
        width={50}
        height={30}
        alt="English (United States)"
        priority={false}
        onClick={() => {
          changeLocale("en-US");
        }}
      />
      <Image
        src={`${basePath}/locale-zhcn.png`}
        width={50}
        height={30}
        alt="Simplified Chinese"
        priority={false}
        onClick={() => {
          changeLocale("zh-CN");
        }}
      />
    </header>,
    <main key="main">
      <Image
        src={`${basePath}/logo.png`}
        width={300}
        height={300}
        alt="Ace Figher Logo"
        priority={false}
      />
      <h1 className="game-title">
        {t("ace-figher")}
      </h1>
      <div>
        <div
          className="main-menu"
        >
          <div className="menu-item">
            <Link href="/vs-ai">{t("vs-ai")}</Link>
          </div>
          <div className="menu-item">
            <Link href="/quick-match" className='disabled'
              aria-disabled={true}
              tabIndex={-1}>{t("quick-match")}</Link>
          </div>
          <div className="menu-item">
            <Link href="/hotseat">{t("hotseat")}</Link>
          </div>
          <div className="menu-item">
            <Link href="/play-with-friend" className='disabled'
              aria-disabled={true}
              tabIndex={-1}>{t("play-with-friend")}</Link>
          </div>
        </div>
      </div>
    </main >
  ]
}