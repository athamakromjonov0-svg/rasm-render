import { createContext, useContext } from "react";

// Butun ilova bo'ylab umumiy holat (user, sahifa, toast...)
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// user.skins ikki xil bo'lishi mumkin:
// - populate qilinmagan -> ["652f...", ...] (string)
// - populate qilingan -> [{ _id, skinName, ... }, ...]
// Ikkelasini ham id massiviga aylantiramiz.
export const ownedIds = (user) =>
  (user?.skins || [])
    .map((s) => (typeof s === "string" ? s : s?._id))
    .filter(Boolean);

export const formatMoney = (n) =>
  `${Number(n || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
