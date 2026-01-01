import React from 'react';
import { MenuStockPlannerV2 } from '../src/components/MenuStock/MenuStockPlannerV2';

const MenuStock: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <MenuStockPlannerV2 />
        </div>
    );
};

export default MenuStock;
