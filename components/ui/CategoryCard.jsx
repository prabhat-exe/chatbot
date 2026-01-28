export default function CategoryCard({ category, onClick }) {
    return (
        <div
            className="menu-card category-card"
            onClick={() => onClick(category.category_name)}
        >
            <div className="menu-card-content">
                <h4 className="text-[#1e3a8a] group-hover:text-[#1e3a8a]">
                    {category.category_name}
                </h4>
                <p className="text-[#1e3a8a]">{category.item_count} items</p>
            </div>
        </div>
    );
}