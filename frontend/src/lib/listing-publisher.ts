import { apiClient } from './api-client';
import type {
  ListingPublishJobStatus,
  ListingPublishJobSummary,
  ListingPublishQueueResponse,
} from '../types/listing';

export const queueListingPublish = async (
  listingId: string,
  payload: Record<string, unknown>,
) => {
  const { data } = await apiClient.post<ListingPublishQueueResponse>(
    `/listings/${listingId}/publish`,
    payload,
  );
  return data;
};

export const getListingPublishJobStatus = async (jobId: string) => {
  const { data } = await apiClient.get<ListingPublishJobStatus>(
    `/listing-publisher/jobs/${jobId}`,
  );
  return data;
};

export const getListingPublishJobs = async (limit = 10) => {
  const { data } = await apiClient.get<ListingPublishJobSummary[]>(
    '/listing-publisher/jobs',
    {
      params: { limit },
    },
  );
  return data;
};
