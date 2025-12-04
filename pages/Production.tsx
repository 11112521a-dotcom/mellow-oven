import React from 'react';
import { ProductionPlanner } from '@/src/components/Production/ProductionPlanner';

const Production: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Smart Production Planner */}
            <ProductionPlanner />
        </div>
    );
};

export default Production;
