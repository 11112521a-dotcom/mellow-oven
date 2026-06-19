import React from 'react';
import { ConsignmentList } from '../src/components/Consignment/ConsignmentList';

const ConsignmentPage: React.FC = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ConsignmentList />
        </div>
    );
};

export default ConsignmentPage;
