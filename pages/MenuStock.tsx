import React from 'react';
import { MenuStockPlanner } from '../src/components/MenuStock/MenuStockPlanner';

const MenuStock: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <MenuStockPlanner />
        </div>
    );
};

export default MenuStock;
