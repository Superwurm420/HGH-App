'use client';

import { useEffect } from 'react';

const HILDESHEIM_LATITUDE = 52.1500;
const HILDESHEIM_LONGITUDE = 9.9500;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function dayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

function decimalHoursToMs(value: number): number {
  const normalized = ((value % 24) + 24) % 24;
  return Math.round(normalized * 60 * 60 * 1000);
}

function buildUtcDateFromDecimalHours(date: Date, decimalHours: number): Date {
  const midnightUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
  return new Date(midnightUtc + decimalHoursToMs(decimalHours));
}

function calculateSunTime(date: Date, isSunrise: boolean): Date {
  const n = dayOfYear(date);
  const lngHour = HILDESHEIM_LONGITUDE / 15;
  const approxTime = n + ((isSunrise ? 6 : 18) - lngHour) / 24;

  const meanAnomaly = 0.9856 * approxTime - 3.289;
  let trueLongitude = meanAnomaly + 1.916 * Math.sin(toRadians(meanAnomaly)) + 0.02 * Math.sin(2 * toRadians(meanAnomaly)) + 282.634;
  trueLongitude = ((trueLongitude % 360) + 360) % 360;

  let rightAscension = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))));
  rightAscension = ((rightAscension % 360) + 360) % 360;

  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
  const rightAscensionQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = (rightAscension + (longitudeQuadrant - rightAscensionQuadrant)) / 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));

  const zenith = toRadians(90.833);
  const cosHourAngle = (Math.cos(zenith) - sinDeclination * Math.sin(toRadians(HILDESHEIM_LATITUDE))) /
    (cosDeclination * Math.cos(toRadians(HILDESHEIM_LATITUDE)));

  if (cosHourAngle > 1) {
    return buildUtcDateFromDecimalHours(date, 8);
  }

  if (cosHourAngle < -1) {
    return buildUtcDateFromDecimalHours(date, 16);
  }

  let hourAngle = isSunrise ? 360 - toDegrees(Math.acos(cosHourAngle)) : toDegrees(Math.acos(cosHourAngle));
  hourAngle /= 15;

  const localMeanTime = hourAngle + rightAscension - 0.06571 * approxTime - 6.622;
  const universalTime = localMeanTime - lngHour;

  return buildUtcDateFromDecimalHours(date, universalTime);
}

function isSunUp(now: Date): boolean {
  const sunrise = calculateSunTime(now, true);
  const sunset = calculateSunTime(now, false);
  return now >= sunrise && now < sunset;
}

export function TvPageController() {
  useEffect(() => {
    document.body.classList.add('tv-mode');

    const syncTheme = () => {
      const isDaytime = isSunUp(new Date());
      document.documentElement.classList.toggle('light', isDaytime);
    };

    syncTheme();
    const timer = window.setInterval(syncTheme, 60_000);

    return () => {
      window.clearInterval(timer);
      document.body.classList.remove('tv-mode');

      const mode = localStorage.getItem('hgh:theme') || 'system';
      const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('light', !isDark);
    };
  }, []);

  return null;
}
