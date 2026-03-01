/**
 * Parent Navigator
 *
 * Parent portal stack: Home, Child, Grades, Attendance, Report Card
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentStackParamList } from './types';

import {
  ParentHomeScreen,
  ParentChildScreen,
  ParentChildGradesScreen,
  ParentChildAttendanceScreen,
  ParentChildReportCardScreen,
} from '@/screens/parent';

const Stack = createNativeStackNavigator<ParentStackParamList>();

const ParentNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
      initialRouteName="ParentHome"
    >
      <Stack.Screen name="ParentHome" component={ParentHomeScreen} />
      <Stack.Screen name="ParentChild" component={ParentChildScreen} />
      <Stack.Screen name="ParentChildGrades" component={ParentChildGradesScreen} />
      <Stack.Screen name="ParentChildAttendance" component={ParentChildAttendanceScreen} />
      <Stack.Screen name="ParentChildReportCard" component={ParentChildReportCardScreen} />
    </Stack.Navigator>
  );
};

export default ParentNavigator;
