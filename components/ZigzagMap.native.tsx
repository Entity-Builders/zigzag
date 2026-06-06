import { forwardRef, useImperativeHandle, useRef } from 'react';
import MapView, {
  Circle,
  Marker,
  type MapViewProps,
  type Region,
} from 'react-native-maps';

export type ZigzagRegion = Region;

export type ZigzagCoordinate = {
  latitude: number;
  longitude: number;
};

export type ZigzagMapHandle = {
  animateToRegion: (region: ZigzagRegion, duration?: number) => void;
  fitToCoordinates: (
    coordinates: ZigzagCoordinate[],
    options?: Parameters<MapView['fitToCoordinates']>[1],
  ) => void;
};

export const ZigzagMap = forwardRef<ZigzagMapHandle, MapViewProps>(
  (props, ref) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      fitToCoordinates: (coordinates, options) => {
        mapRef.current?.fitToCoordinates(coordinates, options);
      },
    }));

    return <MapView ref={mapRef} {...props} />;
  },
);

ZigzagMap.displayName = 'ZigzagMap';

export const ZigzagMarker = Marker;
export const ZigzagCircle = Circle;
