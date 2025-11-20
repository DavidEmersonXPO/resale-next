import { useQuery } from '@tanstack/react-query';
import { getListingPublishJobs } from '../lib/listing-publisher';

export const useListingPublishJobs = (limit = 10) => {
  return useQuery({
    queryKey: ['listing-publish-jobs', limit],
    queryFn: () => getListingPublishJobs(limit),
    staleTime: 5000,
  });
};
