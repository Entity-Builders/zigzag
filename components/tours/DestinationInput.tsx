import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Text, ScrollView } from 'react-native';
import { Search, MapPin, X } from 'lucide-react-native';
import * as ExpoLocation from 'expo-location';

interface DestinationInputProps {
  value?: string;
  onDestinationChange: (
    destination: string,
    coordinates?: { lat: number; lng: number },
  ) => void;
}

// NEW Places API calls via proxy
async function placesAutocomplete(input: string) {
  const resp = await fetch(
    `${process.env.EXPO_PUBLIC_CORS_PROXY_URL || 'http://localhost:8080'}/gplaces/v1/places:autocomplete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify({ input }),
    },
  );
  if (!resp.ok) throw new Error(`Autocomplete failed: ${resp.status}`);
  return resp.json();
}

async function placeDetails(placeId: string) {
  const resp = await fetch(
    `${process.env.EXPO_PUBLIC_CORS_PROXY_URL || 'http://localhost:8080'}/gplaces/v1/places/${placeId}?fields=id,displayName,formattedAddress,location`,
    {
      headers: {
        'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    },
  );
  if (!resp.ok) throw new Error(`Place details failed: ${resp.status}`);
  return resp.json();
}

export const DestinationInput: React.FC<DestinationInputProps> = ({
  value,
  onDestinationChange,
}) => {
  const [term, setTerm] = useState(value || '');
  const [locationResults, setLocationResults] = useState<
    { place_id: string; structured_formatting: { main_text: string } }[]
  >([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (value) {
      setTerm(value);
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!term || term.length < 3) {
        setLocationResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await placesAutocomplete(term);
        const items = (data.suggestions || [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({
            place_id: p.placeId,
            structured_formatting: { main_text: p.text?.text || '' },
          }));
        setLocationResults(items);
      } catch (e) {
        console.error('Autocomplete error', e);
        setLocationResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [term]);

  const handleSelectItem = async (item: {
    place_id: string;
    structured_formatting: { main_text: string };
  }) => {
    try {
      const details = await placeDetails(item.place_id);
      const destinationName =
        details.formattedAddress ||
        details.displayName?.text ||
        item.structured_formatting.main_text;

      onDestinationChange(destinationName, {
        lat: details.location.latitude,
        lng: details.location.longitude,
      });
      setTerm(destinationName);
      setLocationResults([]);
      setIsFocused(false);
    } catch (error) {
      console.error('Failed to fetch place details:', error);
      onDestinationChange(item.structured_formatting.main_text);
      setTerm(item.structured_formatting.main_text);
      setLocationResults([]);
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    setTerm('');
    setLocationResults([]);
    onDestinationChange('');
    setIsFocused(false);
  };

  const showResults =
    isFocused && locationResults.length > 0 && term.length >= 3;

  return (
    <View className='relative w-full z-50'>
      <View
        className={`flex-row items-center bg-white border rounded-md px-3 py-2 ${
          isFocused ? 'border-blue-500' : 'border-gray-300'
        }`}
      >
        <Search size={20} color='#4B5563' className='mr-2' />
        <TextInput
          placeholder='Buscar destino'
          value={term}
          onChangeText={(text) => {
            setTerm(text);
            if (!text) {
              onDestinationChange('');
              setLocationResults([]);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow item selection
            setTimeout(() => setIsFocused(false), 200);
          }}
          className='flex-1 text-gray-900 text-base'
        />
        {term.length > 0 && (
          <Pressable onPress={handleClear} className='p-1'>
            <X size={20} color='#4B5563' />
          </Pressable>
        )}
      </View>

      {/* Results Dropdown */}
      {showResults && (
        <View className='absolute top-[52px] left-0 right-0 z-[1001] bg-white rounded-md border border-gray-200 shadow-lg elevation-10 max-h-[250px] overflow-hidden'>
          <ScrollView
            nestedScrollEnabled
            className='w-full bg-white'
            keyboardShouldPersistTaps='handled'
          >
            <View className='flex-col p-2 w-full bg-white'>
              {locationResults.map((item) => (
                <Pressable
                  key={item.place_id}
                  onPress={() => handleSelectItem(item)}
                  className='w-full'
                >
                  {({ pressed }) => (
                    <View
                      className={`flex-row items-center p-3 rounded-sm w-full ${
                        pressed ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <View className='w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-3'>
                        <MapPin size={16} color='#3B82F6' />
                      </View>
                      <Text className='flex-1 text-base text-gray-900'>
                        {item.structured_formatting.main_text}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};
