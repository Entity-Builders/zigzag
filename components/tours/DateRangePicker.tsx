import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  Modal,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  days: number;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onDaysChange: (days: number) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  days,
  onStartDateChange,
  onEndDateChange,
  onDaysChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [currentMonth, setCurrentMonth] = useState(
    startDate ? new Date(startDate) : new Date(),
  );
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateRange = (): string => {
    if (!startDate && !endDate) return '';
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      const daysDiff =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);
      return `${startStr} - ${endStr} (${daysDiff} Días)`;
    } else if (start) {
      const startStr = formatDate(startDate);
      return `${startStr} - ${startStr} (1 Día)`;
    }
    return '';
  };

  const handleOpen = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setCurrentMonth(
      startDate
        ? new Date(startDate)
        : endDate
          ? new Date(endDate)
          : new Date(),
    );
    setSelectionMode(startDate && endDate ? 'start' : 'start');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStartDate('');
    setTempEndDate('');
    setSelectionMode('start');
  };

  const handleConfirm = () => {
    if (tempStartDate) onStartDateChange(tempStartDate);
    if (tempEndDate) onEndDateChange(tempEndDate);
    if (tempStartDate && tempEndDate) {
      const start = new Date(tempStartDate);
      const end = new Date(tempEndDate);
      const daysDiff =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      onDaysChange(daysDiff);
    }
    setIsOpen(false);
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    if (selectionMode === 'start') {
      setTempStartDate(dateStr);
      if (tempEndDate) {
        // Si hay fecha fin y la nueva inicio es posterior, limpiamos fin
        if (new Date(dateStr) > new Date(tempEndDate)) {
          setTempEndDate('');
        }
      }
      setSelectionMode('end'); // Automáticamente pasar a seleccionar fin
    } else {
      // Modo fin
      if (tempStartDate && new Date(dateStr) < new Date(tempStartDate)) {
        // Si la fecha seleccionada es anterior a inicio, la hacemos inicio
        setTempStartDate(dateStr);
        setTempEndDate('');
        setSelectionMode('end');
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentMonth(newDate);
  };

  const isDateSelected = (day: number): boolean => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === tempStartDate || dateStr === tempEndDate;
  };

  const isDateInRange = (day: number): boolean => {
    if (!tempStartDate || !tempEndDate) return false;
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const start = new Date(tempStartDate);
    const end = new Date(tempEndDate);
    return date >= start && date <= end;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Días vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <View className='flex-col w-full gap-4'>
        {/* Month Navigation */}
        <View className='flex-row justify-between items-center px-2'>
          <Pressable onPress={() => navigateMonth('prev')} className='p-2'>
            <ChevronLeft size={24} color='#4B5563' />
          </Pressable>
          <Text className='text-lg font-bold text-gray-900'>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <Pressable onPress={() => navigateMonth('next')} className='p-2'>
            <ChevronRight size={24} color='#4B5563' />
          </Pressable>
        </View>

        {/* Week Days Header */}
        <View className='flex-row justify-around gap-1'>
          {weekDays.map((day) => (
            <View key={day} className='w-12 items-center'>
              <Text className='text-xs font-semibold text-gray-600'>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className='flex-col gap-1'>
          {Array.from({ length: Math.ceil(days.length / 7) }).map(
            (_, weekIndex) => (
              <View key={weekIndex} className='flex-row justify-around gap-1'>
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = days[weekIndex * 7 + dayIndex];
                  if (day === null || day === undefined) {
                    return <View key={dayIndex} className='w-12 h-12' />;
                  }

                  const date = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day,
                  );
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = isDateSelected(day);
                  const inRange = isDateInRange(day);
                  const isToday =
                    dateStr === new Date().toISOString().split('T')[0];
                  const isStart = dateStr === tempStartDate;
                  const isEnd = dateStr === tempEndDate;

                  return (
                    <Pressable
                      key={dayIndex}
                      onPress={() => handleDateSelect(date)}
                    >
                      <View
                        className={`w-12 h-12 rounded-md items-center justify-center ${
                          isStart || isEnd
                            ? 'bg-blue-500'
                            : inRange
                              ? 'bg-blue-50'
                              : 'bg-transparent'
                        } ${isToday ? 'border border-blue-500' : ''}`}
                      >
                        <Text
                          className={`text-sm ${
                            isStart || isEnd
                              ? 'font-bold text-white'
                              : inRange
                                ? 'text-blue-500'
                                : 'text-gray-900'
                          }`}
                        >
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ),
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Pressable onPress={handleOpen}>
        <View className='flex-row items-center border border-gray-300 rounded-md bg-white h-12 px-3'>
          <Calendar size={20} color='#4B5563' className='mr-2' />
          <TextInput
            placeholder='Seleccionar fechas'
            value={formatDateRange()}
            editable={false}
            className='flex-1 text-gray-900 text-base py-0 pointer-events-none'
          />
        </View>
      </Pressable>

      <Modal
        visible={isOpen}
        animationType='slide'
        transparent={true}
        onRequestClose={handleClose}
      >
        <View className='flex-1 justify-end bg-black/40'>
          <View className='bg-white rounded-t-3xl w-full max-h-[85%]'>
            <View className='w-12 h-1.5 bg-gray-300 rounded-full self-center mt-3 mb-2' />
            <ScrollView
              className='w-full'
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View className='flex-col p-4 w-full gap-5'>
                <Text className='text-lg font-bold text-gray-900 text-center'>
                  Seleccionar Fechas
                </Text>

                {/* Mode Selection Buttons */}
                <View className='flex-row gap-4 mb-2'>
                  <Pressable
                    className={`flex-1 rounded-md py-3 items-center ${
                      selectionMode === 'start'
                        ? 'bg-blue-500'
                        : 'bg-white border border-gray-300'
                    }`}
                    onPress={() => setSelectionMode('start')}
                  >
                    <Text
                      className={
                        selectionMode === 'start'
                          ? 'text-white font-medium'
                          : 'text-gray-600'
                      }
                    >
                      Fecha Inicio
                    </Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 rounded-md py-3 items-center ${
                      selectionMode === 'end'
                        ? 'bg-blue-500'
                        : 'bg-white border border-gray-300'
                    } ${!tempStartDate ? 'opacity-50' : ''}`}
                    onPress={() => setSelectionMode('end')}
                    disabled={!tempStartDate}
                  >
                    <Text
                      className={
                        selectionMode === 'end'
                          ? 'text-white font-medium'
                          : 'text-gray-600'
                      }
                    >
                      Fecha Fin
                    </Text>
                  </Pressable>
                </View>

                {/* Calendar */}
                {renderCalendar()}

                {/* Selection Status */}
                <View className='flex-row justify-around mt-4'>
                  <View className='items-center flex-1'>
                    <Text className='text-xs text-gray-600 mb-1'>
                      Fecha Inicio
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${
                        tempStartDate ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    >
                      {tempStartDate
                        ? formatDate(tempStartDate)
                        : 'No seleccionada'}
                    </Text>
                  </View>
                  <View className='items-center flex-1'>
                    <Text className='text-xs text-gray-600 mb-1'>
                      Fecha Fin
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${
                        tempEndDate ? 'text-blue-500' : 'text-gray-400'
                      }`}
                    >
                      {tempEndDate
                        ? formatDate(tempEndDate)
                        : 'No seleccionada'}
                    </Text>
                  </View>
                  <View className='items-center flex-1'>
                    <Text className='text-xs text-gray-600 mb-1'>Duración</Text>
                    <Text
                      className={`text-sm font-semibold ${
                        tempStartDate && tempEndDate
                          ? 'text-blue-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {tempStartDate && tempEndDate
                        ? `${
                            Math.ceil(
                              (new Date(tempEndDate).getTime() -
                                new Date(tempStartDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            ) + 1
                          } Días`
                        : '-'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className='flex-row gap-4 mt-8 mb-4'>
                  <Pressable
                    className='flex-1 py-4 border border-red-500 rounded-md items-center'
                    onPress={handleClear}
                  >
                    <Text className='text-red-500 font-medium'>Limpiar</Text>
                  </Pressable>
                  <Pressable
                    className={`flex-1 py-4 rounded-md items-center ${
                      !tempStartDate || !tempEndDate
                        ? 'bg-blue-300'
                        : 'bg-blue-600'
                    }`}
                    onPress={handleConfirm}
                    disabled={!tempStartDate || !tempEndDate}
                  >
                    <Text className='text-white font-medium'>Confirmar</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};
