import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  User,
  Users,
  Baby,
  UserPlus,
  Footprints,
  Car,
  Bike,
  Bus,
  Sparkles,
} from 'lucide-react-native';
import { GenerateTourDto } from '@/api/tours';
import { DestinationInput } from './DestinationInput';
import { DateRangePicker } from './DateRangePicker';
import { Map } from '@/features/map';
import { AppContext } from '@/context/app';
import * as ExpoLocation from 'expo-location';

interface TourWizardFormProps {
  onSubmit: (preferences: GenerateTourDto) => void;
  onCancel: () => void;
  initialLocation?: { lat: number; lng: number };
}

const INTEREST_OPTIONS = [
  'Historia',
  'Arte',
  'Comida',
  'Naturaleza',
  'Cultura',
  'Arquitectura',
  'Playa',
  'Compras',
  'Vida Nocturna',
  'Deportes',
];

const INTEREST_MAP: Record<string, string> = {
  Historia: 'history',
  Arte: 'art',
  Comida: 'food',
  Naturaleza: 'nature',
  Cultura: 'culture',
  Arquitectura: 'architecture',
  Playa: 'beach',
  Compras: 'shopping',
  'Vida Nocturna': 'nightlife',
  Deportes: 'sports',
};

export const TourWizardForm: React.FC<TourWizardFormProps> = ({
  onSubmit,
  onCancel,
  initialLocation,
}) => {
  const { setCenter } = useContext(AppContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [destination, setDestination] = useState<string>('');
  const [destinationCoords, setDestinationCoords] = useState<
    { lat: number; lng: number } | undefined
  >(initialLocation);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [days, setDays] = useState<number>(3);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [budgetLevel, setBudgetLevel] = useState<'low' | 'medium' | 'high'>(
    'low',
  );
  const [transportationMode, setTransportationMode] = useState<string[]>([
    'walking',
  ]);
  const [travelPace, setTravelPace] = useState<number>(50); // 0-100, 0=relaxed, 100=fast
  const [groupType, setGroupType] = useState<
    'solo' | 'couple' | 'family' | 'friends'
  >('solo');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Get current location on mount if useCurrentLocation is enabled
  useEffect(() => {
    const getInitialLocation = async () => {
      // If we have initialLocation, use it
      if (initialLocation && !destinationCoords) {
        setDestinationCoords(initialLocation);
        setCenter(initialLocation);
        return;
      }

      // If useCurrentLocation is enabled and we don't have coordinates yet
      if (useCurrentLocation && !destinationCoords) {
        try {
          const { status } =
            await ExpoLocation.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await ExpoLocation.getCurrentPositionAsync({});
            const coords = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
            setDestinationCoords(coords);
            setCenter(coords);
          }
        } catch (error) {
          console.error('Error getting initial location:', error);
        }
      }
    };

    getInitialLocation();
  }, []); // Only run on mount

  // Update map center when destination coordinates change
  useEffect(() => {
    if (destinationCoords) {
      setCenter(destinationCoords);
    } else if (initialLocation) {
      setCenter(initialLocation);
    }
  }, [destinationCoords, initialLocation, setCenter]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const toggleTransportationMode = (mode: string) => {
    setTransportationMode((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    setUseCurrentLocation(value);
    if (value) {
      try {
        const { status } =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await ExpoLocation.getCurrentPositionAsync({});
          const coords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setDestinationCoords(coords);
          setCenter(coords);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    } else {
      // When toggled off, clear destination coords if they were from current location
      // But keep them if user had selected a destination
      if (!destination) {
        setDestinationCoords(undefined);
      }
    }
  };

  const getPaceValue = (): 'relaxed' | 'moderate' | 'fast' => {
    if (travelPace < 33) return 'relaxed';
    if (travelPace < 67) return 'moderate';
    return 'fast';
  };

  const handleSubmit = () => {
    // Build startDates array if dates are provided
    const startDates: string[] = [];
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        startDates.push(start.toISOString());
      }
    }
    if (endDate && endDate !== startDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        startDates.push(end.toISOString());
      }
    }

    const preferences: GenerateTourDto = {
      destination: destination || undefined,
      destinationLatitude: destinationCoords?.lat,
      destinationLongitude: destinationCoords?.lng,
      days,
      budgetLevel,
      transportationMode: transportationMode as any,
      travelPace: getPaceValue(),
      groupType,
      interests:
        selectedInterests.length > 0
          ? selectedInterests.map((i) => INTEREST_MAP[i] || i.toLowerCase())
          : undefined,
      startDates: startDates.length > 0 ? startDates : undefined,
      latitude: destinationCoords?.lat || initialLocation?.lat,
      longitude: destinationCoords?.lng || initialLocation?.lng,
      includeExistingActivities: true,
      skipImageGeneration: true,
    };

    onSubmit(preferences);
  };

  const renderStep1 = () => {
    const mapCoords = destinationCoords || initialLocation;
    const marker = mapCoords
      ? [
          {
            id: 'destination',
            coordinate: {
              latitude: mapCoords.lat,
              longitude: mapCoords.lng,
            },
            title:
              destination ||
              (useCurrentLocation
                ? 'Mi ubicación actual'
                : 'Ubicación seleccionada'),
            description: '',
          },
        ]
      : [];

    return (
      <View className='flex-col gap-6 flex-1'>
        {/* Map */}
        <View className='h-48 rounded-lg overflow-hidden border border-gray-200'>
          {mapCoords ? (
            <View className='h-full w-full'>
              <Map markers={marker} />
            </View>
          ) : (
            <View className='bg-gray-100 h-full justify-center items-center'>
              <MapPin size={40} color='#3B82F6' />
              <Text className='mt-2 text-gray-500 text-sm'>
                Selecciona un destino para ver el mapa
              </Text>
            </View>
          )}
        </View>

        {/* Search Destination */}
        <View className='relative z-[1000]'>
          <DestinationInput
            value={destination}
            onDestinationChange={(dest, coords) => {
              setDestination(dest);
              if (coords) {
                setDestinationCoords(coords);
              }
            }}
          />
        </View>

        {/* Date Range */}
        <View className='relative z-0'>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            days={days}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onDaysChange={setDays}
          />
        </View>

        {/* Use Current Location Toggle */}
        <View className='flex-row justify-between items-center -z-10 relative'>
          <Text className='text-base text-gray-900'>
            Usar mi ubicación actual
          </Text>
          <Switch
            value={useCurrentLocation}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
            thumbColor='#FFFFFF'
          />
        </View>
      </View>
    );
  };

  const renderStep2 = () => (
    <View className='flex-col gap-6 flex-1'>
      {/* Budget */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>Presupuesto</Text>
        <View className='flex-row gap-3'>
          {(['low', 'medium', 'high'] as const).map((level) => (
            <Pressable
              key={level}
              className='flex-1'
              onPress={() => setBudgetLevel(level)}
            >
              <View
                className={`border rounded-md p-4 items-center justify-center h-16 ${
                  budgetLevel === level
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`text-xl font-bold ${
                    budgetLevel === level ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {'$'.repeat(level === 'low' ? 1 : level === 'medium' ? 2 : 3)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Company */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>Compañía</Text>
        <View className='flex-row justify-around gap-2'>
          {[
            { type: 'solo' as const, icon: User, label: 'Solo' },
            { type: 'couple' as const, icon: Users, label: 'Pareja' },
            { type: 'family' as const, icon: Baby, label: 'Familia' },
            { type: 'friends' as const, icon: UserPlus, label: 'Amigos' },
          ].map(({ type, icon: IconComponent, label }) => (
            <Pressable
              key={type}
              onPress={() => setGroupType(type)}
              className='items-center'
            >
              <View
                className={`w-16 h-16 rounded-full items-center justify-center ${
                  groupType === type
                    ? 'bg-blue-500 border-2 border-blue-500'
                    : 'bg-gray-100 border-0'
                }`}
              >
                <IconComponent
                  size={24}
                  color={groupType === type ? '#ffffff' : '#4b5563'}
                />
              </View>
              <Text
                className={`mt-2 text-sm ${
                  groupType === type
                    ? 'text-blue-500 font-medium'
                    : 'text-gray-500'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Pace */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>Ritmo</Text>
        <View className='flex-row gap-3'>
          {[
            { value: 25, label: 'Relax' },
            { value: 50, label: 'Moderado' },
            { value: 75, label: 'Rápido' },
          ].map((pace) => {
            const isSelected =
              Math.abs(travelPace - pace.value) <= 15 ||
              travelPace === pace.value;
            return (
              <Pressable
                key={pace.label}
                className='flex-1'
                onPress={() => setTravelPace(pace.value)}
              >
                <View
                  className={`border rounded-md py-3 items-center justify-center ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {pace.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Transport */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>
          Transporte (Selección múltiple)
        </Text>
        <View className='flex-row justify-around gap-2'>
          {[
            { mode: 'walking', icon: Footprints, label: 'Pie' },
            { mode: 'driving', icon: Car, label: 'Auto' },
            { mode: 'cycling', icon: Bike, label: 'Bici' },
            { mode: 'public_transport', icon: Bus, label: 'Público' },
          ].map(({ mode, icon: IconComponent, label }) => {
            const isSelected = transportationMode.includes(mode);
            return (
              <Pressable
                key={mode}
                onPress={() => toggleTransportationMode(mode)}
                className='items-center'
              >
                <View
                  className={`w-16 h-16 rounded-full items-center justify-center ${
                    isSelected
                      ? 'bg-blue-500 border-2 border-blue-500'
                      : 'bg-gray-100 border-0'
                  }`}
                >
                  <IconComponent
                    size={24}
                    color={isSelected ? '#ffffff' : '#4b5563'}
                  />
                </View>
                <Text
                  className={`mt-2 text-sm ${
                    isSelected ? 'text-blue-500 font-medium' : 'text-gray-500'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View className='flex-col gap-8 flex-1'>
      {/* Interests */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>Intereses</Text>
        <View className='flex-row flex-wrap gap-2'>
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <Pressable
                key={interest}
                onPress={() => toggleInterest(interest)}
              >
                <View
                  className={`border rounded-full px-4 py-2 ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isSelected ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {interest}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Special Notes */}
      <View className='flex-col gap-3'>
        <Text className='text-lg font-semibold text-gray-900'>
          Algo especial?
        </Text>
        <TextInput
          className='border border-gray-300 rounded-lg p-3 min-h-[120px] bg-white text-base text-gray-900'
          placeholder='Escribe aquí... (ej. Soy vegano...)'
          value={specialNotes}
          onChangeText={setSpecialNotes}
          multiline
          textAlignVertical='top'
        />
      </View>
    </View>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Paso 1/3: Destino y Fechas';
      case 2:
        return 'Paso 2/3: Define tu estilo';
      case 3:
        return 'Paso 3/3: Personalización IA';
      default:
        return '';
    }
  };

  return (
    <View className='flex-1 bg-white'>
      {/* Header */}
      <View className='bg-blue-500 pt-12 pb-4 px-4'>
        <View className='flex-row items-center gap-4 mb-2'>
          <Pressable onPress={handleBack}>
            <ArrowLeft size={24} color='white' />
          </Pressable>
          <View className='w-6' />
        </View>
        <Text className='text-center text-sm text-white opacity-90'>
          {getStepTitle()}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <View className='p-4 pb-24'>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View className='absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8'>
        <Pressable
          onPress={handleNext}
          className='bg-blue-500 rounded-md py-4 flex-row justify-center items-center'
        >
          <Text className='text-white font-semibold text-base'>
            {currentStep === 3 ? 'Generar ZigZag ✨' : 'Siguiente →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
