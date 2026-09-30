import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TelecallerLeadModal } from '../../components/telecaller/TelecallerLeadModal';

export const TelecallerLeadPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  return (
    <div className="py-6">
      <TelecallerLeadModal
        leadId={leadId || null}
        onClose={() => navigate('/telecaller/roster')}
        onActionComplete={() => navigate('/telecaller/roster')}
      />
    </div>
  );
};
