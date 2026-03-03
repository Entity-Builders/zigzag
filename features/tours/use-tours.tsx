import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PaginatedResponseTour, Tour } from '../../components/types';
import { useApi } from '../../api/hooks/useApi';

export const useTours = (
  addressCoordinates:
    | {
        lat: number;
        lng: number;
      }
    | undefined,
) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTours, setTotalTours] = useState<number>(0);
  const [currentTourIndex, setCurrentTourIndex] = useState<number>(0);
  const [coordinates, setCoordinates] = useState<{
    latitude: string;
    longitude: string;
  }>({
    latitude: addressCoordinates?.lat.toString() || '-34.6018365',
    longitude: addressCoordinates?.lng.toString() || '-58.4566444',
  });

  const [tours, setTours] = useState<Tour[]>([]);

  const getTours = async () => {
    try {
      // Basic pagination via Supabase PostgREST
      const itemsPerPage = 10;
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error } = await supabase
        .from('tour')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('createdAt', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const calculatedTotalPages = count ? Math.ceil(count / itemsPerPage) : 1;
      setTotalPages(calculatedTotalPages);
      setTotalTours(count || 0);
      setTours(data || []);

      return {
        data: {
          tours: data || [],
          meta: { totalPages: calculatedTotalPages },
        },
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch tours',
          code: 'API_ERROR',
        },
      };
    }
  };

  const {
    data: toursData,
    error: toursError,
    loading: toursLoading,
  } = useApi<PaginatedResponseTour>(getTours);

  useEffect(() => {
    if (toursData) {
      setTours(toursData.tours);
    }
  }, [toursData]);

  return {
    currentPage,
    totalPages,
    totalTours,
    currentTourIndex,
    tours,
    coordinates,
    toursData,
    toursError,
    toursLoading,
    setCoordinates,
    getTours,
    setCurrentTourIndex,
  };
};
