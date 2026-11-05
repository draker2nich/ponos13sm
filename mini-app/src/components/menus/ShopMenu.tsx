import { ShoppingBag } from "lucide-react";

export function ShopMenu() {
  return (
    <div className="menu-empty">
      <ShoppingBag size={28} strokeWidth={1.5} />
      <span>Магазин пока закрыт</span>
      <span className="menu-card__sub">Скоро здесь появятся вещи для питомца</span>
    </div>
  );
}
