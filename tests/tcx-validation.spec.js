import { test, expect } from '@playwright/test';
import { buildTcx } from '../export.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

test.describe('TCX Export Validation', () => {
  test('generates valid TCX v2 XML that passes xmllint schema validation', async () => {
    // Generate sample data
    const samples = [];
    const baseTime = Date.now();
    const baseLat = 45.0703, baseLon = 6.0640; // Villard-Reculas
    let dist = 0;
    
    for (let i = 0; i < 120; i++) { // 2 minutes of data
      const t = baseTime + i * 1000;
      const lat = baseLat + (i * 0.00001);
      const lon = baseLon + (i * 0.00001);
      const alt = 1650 + Math.sin(i / 10) * 20;
      const w = 150 + Math.sin(i / 5) * 30;
      const cad = 80 + Math.sin(i / 8) * 10;
      const v = 7.5; // ~27 km/h
      dist += v * 1; // 1 second increment
      
      samples.push({ t, lat, lon, alt, dist, w, cad, v });
    }
    
    // Build TCX
    const tcx = buildTcx(samples, { name: 'Test Ride', version: '0.5.13' });
    
    // Basic structure checks
    expect(tcx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(tcx).toContain('<TrainingCenterDatabase');
    expect(tcx).toContain('xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"');
    expect(tcx).toContain('xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"');
    expect(tcx).toContain('<Activity Sport="Biking">');
    
    // Check Lap element order (schema requirement)
    const lapMatch = tcx.match(/<Lap StartTime="[^"]+">[\s\S]*?<\/Lap>/);
    expect(lapMatch).toBeTruthy();
    const lapContent = lapMatch[0];
    
    // Verify required order: TotalTimeSeconds, DistanceMeters, MaximumSpeed, Calories, Intensity, Cadence?, TriggerMethod, Track
    const lapElements = [
      '<TotalTimeSeconds>',
      '<DistanceMeters>',
      '<MaximumSpeed>',
      '<Calories>',
      '<Intensity>',
      '<TriggerMethod>',
      '<Track>',
    ];
    
    let lastIndex = 0;
    for (const elem of lapElements) {
      const index = lapContent.indexOf(elem);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex); // Must be in order
      lastIndex = index;
    }
    
    // If Cadence is present, it must be after Intensity and before TriggerMethod
    if (lapContent.includes('<Cadence>')) {
      const intensityIdx = lapContent.indexOf('<Intensity>');
      const cadenceIdx = lapContent.indexOf('<Cadence>');
      const triggerIdx = lapContent.indexOf('<TriggerMethod>');
      expect(cadenceIdx).toBeGreaterThan(intensityIdx);
      expect(cadenceIdx).toBeLessThan(triggerIdx);
    }
    
    // Check Trackpoint element order
    const trackpointMatch = tcx.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/);
    expect(trackpointMatch).toBeTruthy();
    const tpContent = trackpointMatch[0];
    
    // Verify required order: Time, Position, AltitudeMeters, DistanceMeters, Cadence?, Extensions
    const tpElements = [
      '<Time>',
      '<Position>',
      '<AltitudeMeters>',
      '<DistanceMeters>',
    ];
    
    lastIndex = 0;
    for (const elem of tpElements) {
      const index = tpContent.indexOf(elem);
      expect(index).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    
    // Check Notes - should appear once only
    const notesMatches = tcx.match(/<Notes>.*?<\/Notes>/g);
    expect(notesMatches).toHaveLength(1);
    expect(notesMatches[0]).toContain('Test Ride (virtual ride)');
    expect(notesMatches[0]).not.toMatch(/\(virtual ride\).*\(virtual ride\)/); // No duplication
    
    // Check Author/Application_t structure
    expect(tcx).toContain('<Author xsi:type="Application_t">');
    expect(tcx).toContain('<Name>Velo Virtuel</Name>');
    expect(tcx).toContain('<Build>');
    expect(tcx).toContain('<Version>');
    expect(tcx).toContain('<VersionMajor>0</VersionMajor>');
    expect(tcx).toContain('<VersionMinor>5</VersionMinor>');
    expect(tcx).toContain('<BuildMajor>13</BuildMajor>');
    expect(tcx).toContain('<BuildMinor>0</BuildMinor>');
    expect(tcx).toContain('</Version>');
    expect(tcx).toContain('</Build>');
    expect(tcx).toContain('<LangID>en</LangID>');
    expect(tcx).toContain('<PartNumber>000-00000-00</PartNumber>');
    
    // Validate against official schema with xmllint
    const tempFile = '/tmp/test-ride.tcx';
    writeFileSync(tempFile, tcx);
    
    try {
      execSync(`xmllint --noout --schema TrainingCenterDatabasev2.xsd ${tempFile}`, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      // If we get here, validation passed
      expect(true).toBe(true);
    } catch (e) {
      // xmllint failed - capture output
      const output = e.stderr ? e.stderr.toString() : e.stdout.toString();
      console.error('xmllint validation failed:', output);
      throw new Error(`TCX schema validation failed: ${output}`);
    }
  });
  
  test('handles rides without cadence data', async () => {
    const samples = [];
    const baseTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      samples.push({
        t: baseTime + i * 1000,
        lat: 45.0 + i * 0.0001,
        lon: 6.0 + i * 0.0001,
        alt: 1650,
        dist: i * 10,
        w: 150,
        cad: 0, // No cadence
        v: 7.5
      });
    }
    
    const tcx = buildTcx(samples, { name: 'No Cadence Ride', version: '0.5.13' });
    
    // Should not contain Cadence elements when cadence is 0
    const lapMatch = tcx.match(/<Lap StartTime="[^"]+">[\s\S]*?<\/Lap>/);
    expect(lapMatch[0]).not.toContain('<Cadence>');
    
    const trackpointMatches = tcx.match(/<Trackpoint>[\s\S]*?<\/Trackpoint>/g);
    for (const tp of trackpointMatches) {
      expect(tp).not.toContain('<Cadence>');
    }
  });
});
