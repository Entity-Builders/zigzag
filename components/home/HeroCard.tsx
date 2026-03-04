import React from 'react';
import { View, Image, Text } from 'react-native';

const HERO_CARD_IMAGE =
  'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSzQp2oIICWexnmDApBuLjKa_BraOYa16ccgP86FaMFX3wE7OmsfW4N10nR1K8pQ1Bh33tiYMDxbCAhA_PIF1oFpRY56NJmrjerRIHuidg-oa9V7nT70ZY-IE8aQ-_6WdYavUR53HQ=s680-w680-h510-rw';

export const HeroCard = () => {
  return (
    <View className='px-4'>
      <View className='h-[450px] rounded-3xl overflow-hidden relative bg-gray-900'>
        <Image
          source={{ uri: HERO_CARD_IMAGE }}
          alt='Palacio Barolo'
          className='w-full h-full'
          resizeMode='cover'
        />

        {/* Gradient Overlay Simulation */}
        <View className='absolute bottom-0 left-0 right-0 h-[200px] bg-black opacity-40' />

        {/* Content Overlay */}
        <View className='absolute bottom-0 left-0 right-0 p-6 flex-col gap-1'>
          <Text className='text-white text-sm font-medium opacity-90'>
            Recomendado en tu zona:
          </Text>
          <Text className='text-white text-3xl font-bold'>
            Atardecer en el{'\n'}Palacio Barolo
          </Text>
        </View>
      </View>
    </View>
  );
};
