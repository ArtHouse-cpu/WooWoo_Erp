import type {SpaceCard} from '../../services/space.service';
import {SpaceBookingModal} from './SpaceBookingModal';

type Props = {
  space: SpaceCard | null;
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string | Date;
  initialStartTime?: string;
  initialEndTime?: string;
};

export function CustomerSpaceCheckout({
  space,
  isOpen,
  onClose,
  initialDate,
  initialStartTime,
  initialEndTime,
}: Props) {
  return (
    <SpaceBookingModal
      space={space}
      isOpen={isOpen}
      onClose={onClose}
      initialDate={initialDate}
      initialStartTime={initialStartTime}
      initialEndTime={initialEndTime}
    />
  );
}
