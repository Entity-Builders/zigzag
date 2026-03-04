import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View className='flex-1 items-center justify-center'>
      <View className='flex-col items-center gap-4'>
        <Text className='text-2xl font-bold mb-2'>Profile</Text>
        <Pressable
          onPress={() => router.push('/')}
          className='bg-blue-600 px-6 py-3 rounded-lg flex-row items-center justify-center'
        >
          <Text className='text-white font-medium text-lg'>Volver a Home</Text>
        </Pressable>
      </View>
    </View>
  );
}
