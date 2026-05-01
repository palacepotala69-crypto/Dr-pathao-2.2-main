import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(localeData);

export const formatDate = (date: string | Date, format = 'LL') => {
  return dayjs(date).format(format);
};

export const getRelativeTime = (date: string | Date) => {
  return dayjs(date).fromNow();
};

export default dayjs;
