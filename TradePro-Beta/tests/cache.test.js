const cacheService = require('../src/backend/services/cacheService');

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.clear();
  });

  test('should set and get cache data', () => {
    const key = 'test_key';
    const value = { test: 'data' };
    
    const setResult = cacheService.set(key, value);
    expect(setResult).toBe(true);
    
    const getResult = cacheService.get(key);
    expect(getResult).toEqual(value);
  });

  test('should return null for non-existent key', () => {
    const result = cacheService.get('non_existent_key');
    expect(result).toBeNull();
  });

  test('should delete cache data', () => {
    const key = 'test_key';
    const value = { test: 'data' };
    
    cacheService.set(key, value);
    const deleteResult = cacheService.delete(key);
    
    expect(deleteResult).toBe(true);
    expect(cacheService.get(key)).toBeNull();
  });

  test('should clear all cache data', () => {
    cacheService.set('key1', 'value1');
    cacheService.set('key2', 'value2');
    
    const clearResult = cacheService.clear();
    expect(clearResult).toBe(true);
    
    expect(cacheService.get('key1')).toBeNull();
    expect(cacheService.get('key2')).toBeNull();
  });

  test('should return cache statistics', () => {
    cacheService.set('key1', 'value1');
    cacheService.set('key2', 'value2');
    
    const stats = cacheService.getStats();
    
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('memoryUsage');
    expect(stats.size).toBe(2);
  });

  test('should refresh cache data', () => {
    const key = 'test_key';
    const value = { test: 'data' };
    
    cacheService.set(key, value);
    const refreshResult = cacheService.refresh(key);
    
    expect(refreshResult).toBe(true);
    expect(cacheService.get(key)).toEqual(value);
  });

  test('should handle cache expiration', (done) => {
    const key = 'expire_test';
    const value = { test: 'data' };
    
    cacheService.set(key, value, 100); // 100ms TTL
    
    setTimeout(() => {
      const result = cacheService.get(key);
      expect(result).toBeNull();
      done();
    }, 150);
  });
});

