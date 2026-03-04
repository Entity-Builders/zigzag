import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MoodsSection } from '@/components/home/MoodsSection';
import { HeroCard } from '@/components/home/HeroCard';
import { RoutesSection } from '@/components/home/RoutesSection';

export default function HomeScreen() {
  return (
    <View className='flex-1 bg-black'>
      <ScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className='flex-col gap-6 pt-4 pb-8'>
          {/* Header Section */}
          <View className='flex-col gap-4 px-4 pt-8'>
            <MoodsSection />
          </View>

          {/* Hero Card */}
          <HeroCard />

          {/* Routes Section */}
          <RoutesSection />
        </View>
      </ScrollView>
    </View>
  );
}
