import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { Link, useLocalSearchParams, router } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/api/hooks/useApi';
import { generateTour } from '@/api/tours';
import { PaginatedResponseTour } from '@/components/types';
import { AppContext } from '@/context/app';

// Leaflet CSS usually requires special handling in React Native Web or might cause issues in Native.
// Assuming this is web-compatible or handled.
if (Platform.OS === 'web') {
  try {
    require('leaflet/dist/leaflet.css');
  } catch (e) {
    // ignore if not available
  }
}

interface PaginatedResponse {
  data: PaginatedResponseTour | null;
}

export default function ToursScreen() {
  const {
    category,
    latitude: latParam,
    longitude: lngParam,
  } = useLocalSearchParams<{
    category?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTours, setTotalTours] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const { address } = useContext(AppContext);

  const handleGenerateUniqueTour = async () => {
    setIsGenerating(true);
    try {
      const existingTourIds = data?.tours.map((t) => t.id) || [];
      const lat = latParam ? parseFloat(latParam) : address?.lat;
      const lng = lngParam ? parseFloat(lngParam) : address?.lng;

      const newTour = await generateTour({
        prompt: category
          ? `Create a unique tour about ${category}`
          : 'Create a unique tour based on hidden gems',
        excludeTours: existingTourIds,
        categories: category ? [category] : [],
        latitude: lat,
        longitude: lng,
      });

      if (newTour && newTour.id) {
        router.push(`/tours/${newTour.id}`);
      }
    } catch (err) {
      console.error('Failed to generate tour', err);
      Alert.alert('Failed to generate a new tour. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTours = async () => {
    try {
      // Basic pagination via Supabase PostgREST
      const itemsPerPage = 10;
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase.from('tour').select('*', { count: 'exact' });

      if (category) {
        // Find tours where categories contains the searched category
        query = query.contains('categories', [category]);
      }

      const {
        data: dbData,
        count,
        error: err,
      } = await query.range(from, to).order('createdAt', { ascending: false });

      if (err) {
        throw new Error(err.message);
      }

      const calculatedTotalPages = count ? Math.ceil(count / itemsPerPage) : 1;
      setTotalPages(calculatedTotalPages);
      setTotalTours(count || 0);

      return {
        data: {
          tours: dbData || [],
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

  const { data, error, loading } = useApi<PaginatedResponseTour>(getTours);

  // Effect to update local state when data changes
  useEffect(() => {
    if (loading) return;
    if (data) {
      setTotalPages(data.meta?.totalPages || 1);
      setTotalTours(data.tours.length);
    }
  }, [data]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category]);

  return (
    <View className='flex-1 bg-slate-50'>
      <FlatList
        data={data?.tours || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View className='flex-col gap-4 mb-4'>
            <Text className='text-2xl font-bold text-slate-900'>
              {category ? `Tours - ${category}` : 'Tours'}
            </Text>
            {category && (
              <Text className='text-sm text-slate-600'>
                Mostrando tours de la categoría: {category}
              </Text>
            )}

            <Pressable
              onPress={() => router.push('/tours/wizard')}
              disabled={isGenerating}
              className={`bg-blue-600 py-3 px-4 rounded-md items-center justify-center ${
                isGenerating ? 'opacity-50' : ''
              }`}
            >
              <Text className='text-white font-medium text-base'>
                Create New Tour
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGenerateUniqueTour}
              disabled={isGenerating}
              className={`border border-blue-600 bg-transparent py-3 px-4 rounded-md flex-row items-center justify-center gap-2 ${
                isGenerating ? 'opacity-50' : ''
              }`}
            >
              {isGenerating ? (
                <ActivityIndicator color='#2563eb' />
              ) : (
                <Text className='text-blue-600 font-medium text-base'>
                  Generate Unique AI Tour 🪄
                </Text>
              )}
            </Pressable>

            {loading && <ActivityIndicator size='large' color='#2563eb' />}

            {error && (
              <View className='bg-red-50 p-3 rounded-md flex-row items-center gap-2'>
                <AlertCircle color='#ef4444' size={20} />
                <Text className='text-red-500 flex-1'>{error.message}</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item: tour }) => (
          <Link href={`/tours/${tour.id}`} asChild>
            <Pressable className='bg-white p-4 rounded-lg shadow-sm border border-slate-100 mb-4'>
              <View className='flex-col gap-1'>
                <Text className='text-lg font-semibold text-slate-900'>
                  {tour.name}
                </Text>
                <Text className='text-slate-600 leading-5'>
                  {tour.description}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
        ListFooterComponent={
          <View className='flex-row items-center justify-center gap-4 mt-4 mb-8'>
            <Pressable
              onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`border border-slate-300 px-4 py-2 rounded-md ${
                currentPage === 1 ? 'opacity-50' : ''
              }`}
            >
              <Text className='text-slate-700'>Previous</Text>
            </Pressable>
            <Text className='text-slate-700'>
              Page {currentPage} of {totalPages}
            </Text>
            <Pressable
              onPress={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className={`border border-slate-300 px-4 py-2 rounded-md ${
                currentPage === totalPages ? 'opacity-50' : ''
              }`}
            >
              <Text className='text-slate-700'>Next</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
