import React from 'react';
import { View, Pressable, Text } from 'react-native';
import {
  Home,
  Bookmark,
  Map as MapIcon,
  User,
  Sparkles,
} from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';

export const BottomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const router = useRouter();

  const handleCreateTour = () => {
    router.push('/tours/wizard');
  };

  return (
    <View className='absolute bottom-0 left-0 right-0 bg-white pt-3 pb-8 border-t border-gray-100 shadow-md'>
      <View className='flex-row justify-around items-center relative'>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          let IconComponent = Home;
          let label = 'Inicio';

          if (route.name === 'index') {
            IconComponent = Home;
            label = 'Inicio';
          } else if (route.name === 'saved') {
            IconComponent = Bookmark;
            label = 'Guardados';
          } else if (route.name === 'map') {
            IconComponent = MapIcon;
            label = 'Mapa';
          } else if (route.name === 'profile') {
            IconComponent = User;
            label = 'Perfil';
          }

          return (
            <Pressable
              key={route.key}
              className='items-center flex-1'
              onPress={onPress}
            >
              <IconComponent
                size={24}
                color={isFocused ? '#2E4038' : '#9CA3AF'}
              />
              <Text
                className={`text-xs mt-1 ${isFocused ? 'text-[#2E4038] font-bold' : 'text-gray-400 font-medium'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* FAB Button */}
      <View className='absolute bottom-16 self-center z-10 w-14 h-14 bg-blue-500 rounded-full shadow-lg'>
        <Pressable
          onPress={handleCreateTour}
          className='flex-1 items-center justify-center p-3'
        >
          <Sparkles size={24} color='white' />
        </Pressable>
      </View>
    </View>
  );
};
