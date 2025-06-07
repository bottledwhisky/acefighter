import { LocalizeFunc } from "@/game/i18n";
import Image from "next/image";

export default function MenuItem({
  t,
  action,
  icon,
}: {
  t: LocalizeFunc
  action: string;
  icon: string;
}) {
  return (
    <div className="menu-item">
      <Image
        src={icon}
        width={20}
        height={20}
        alt={t(action)}
        style={{ margin: "0 5px" }}
      />
      <span>{t(action)}</span>
    </div>
  );
}
