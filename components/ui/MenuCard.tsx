import { MenuItem } from "@/types";

interface Props {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}


export default function MenuCard({ item, onClick }: Props) {
  return (
    <div
      onClick={() => onClick(item)}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-95"
    >
      <div className="flex gap-3 p-3">
        <div className="relative w-20 h-20 flex-shrink-0">
          <img
            src={item.image || "/images/no_preview.png"}
            alt={item.name}
            className="w-full h-full object-cover rounded-lg"
          />
          {item.is_veg && (
            <span className="inline-flex items-center justify-center rounded-md font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&]:hover:bg-primary/90 absolute top-1 left-1 bg-emerald-500 text-white border-0 text-[10px] px-1 py-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-leaf w-2.5 h-2.5 mr-0.5"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
              Veg
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-sm text-gray-900 truncate">
              {item.name}
            </h3>
            {item.price > 0 && (
              <span className="font-bold text-blue-900 text-sm whitespace-nowrap">
                ₹{item.price}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            Freshly prepared with premium ingredients
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.is_chef_special && (
              <span className="inline-flex items-center justify-center rounded-md font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&]:hover:bg-primary/90 bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-flame w-2.5 h-2.5 mr-0.5"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                Chef special
              </span>
            )}
            {item.variation_status === 1 && item.variations && (
              <span className="inline-flex items-center justify-center rounded-md font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&]:hover:bg-primary/90 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5">
                🎨 Customizable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}