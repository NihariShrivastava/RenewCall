import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LeadDetailPanel } from '../../components/common/LeadDetailPanel';

export const LeadViewPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  return (
    <div className="py-6">
      <LeadDetailPanel
        leadId={leadId || null}
        onClose={() => navigate('/admin/leads')}
      />
    </div>
  );
};
