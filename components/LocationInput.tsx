import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';

interface LocationInputProps {
  onLocationChange: (latitude: string, longitude: string) => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  onLocationChange,
}) => {
  const [latitude, setLatitude] = React.useState('20.9119745');
  const [longitude, setLongitude] = React.useState('-100.8232041');
  const [error, setError] = React.useState('');

  const validateCoordinates = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      setError('Please enter valid numbers');
      return false;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return false;
    }

    if (lon < -180 || lon > 180) {
      setError('Longitude must be between -180 and 180');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (validateCoordinates()) {
      onLocationChange(latitude, longitude);
    }
  };

  return (
    <View className='p-4'>
      <View className='flex-col'>
        <View className='flex-row items-center gap-4'>
          <View className='flex-1'>
            <View className='border border-slate-300 rounded-md'>
              <TextInput
                value={latitude}
                onChangeText={setLatitude}
                keyboardType='numeric'
                placeholder='Enter latitude'
                className='p-3 text-slate-800'
              />
            </View>
          </View>
          <View className='flex-1'>
            <View className='border border-slate-300 rounded-md'>
              <TextInput
                value={longitude}
                onChangeText={setLongitude}
                keyboardType='numeric'
                placeholder='Enter longitude'
                className='p-3 text-slate-800'
              />
            </View>
          </View>
        </View>
        {!!error && <Text className='text-red-500 mt-2 text-sm'>{error}</Text>}
      </View>
      <Pressable
        onPress={handleSubmit}
        className='mt-4 bg-blue-600 rounded-md p-3 items-center'
      >
        <Text className='text-white font-medium'>Update Location</Text>
      </Pressable>
    </View>
  );
};
