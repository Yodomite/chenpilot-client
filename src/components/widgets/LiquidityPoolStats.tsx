'use client';

import React, { useState, useEffect } from 'react';
import { LiquidityStats, LiquidityPool } from '@/types';
import { apiService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  BarChart3, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Droplets
} from 'lucide-react';

interface LiquidityPoolStatsProps {
  className?: string;
}

export default function LiquidityPoolStats({ className = '' }: LiquidityPoolStatsProps) {
  const [stats, setStats] = useState<LiquidityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);

  const fetchLiquidityStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getLiquidityStats({
        sortBy: 'liquidity',
        sortOrder: 'desc',
        limit: 10
      });
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Failed to fetch liquidity data');
      }
    } catch (err) {
      setError('Error loading liquidity statistics');
      console.error('Error fetching liquidity stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidityStats();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchLiquidityStats, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-400" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderMetricCard = (title: string, value: string, icon: React.ReactNode, trend?: 'up' | 'down' | 'neutral', subtitle?: string) => (
    <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && getTrendIcon(trend)}
        </div>
      </div>
    </Card>
  );

  const renderTopPools = () => {
    if (!stats?.topPools || stats.topPools.length === 0) return null;

    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-400" />
              Top Liquidity Pools
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLiquidityStats}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="space-y-3">
            {stats.topPools.slice(0, 5).map((pool, index) => (
              <div
                key={pool.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors cursor-pointer"
                onClick={() => setSelectedPool(pool)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full text-sm font-bold text-blue-400">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{pool.token1.symbol}</span>
                      <span className="text-gray-400">/</span>
                      <span className="font-medium text-white">{pool.token2.symbol}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Fee: {pool.fee * 100}% • APR: {formatPercentage(pool.apr)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(pool.totalLiquidity)}</p>
                  <p className="text-xs text-gray-400">Vol: {formatCurrency(pool.volume24h)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  const renderPoolDetails = () => {
    if (!selectedPool) return null;

    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              Pool Details
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPool(null)}
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Token Pair</p>
                <p className="font-medium text-white">
                  {selectedPool.token1.symbol} / {selectedPool.token2.symbol}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Liquidity</p>
                <p className="font-medium text-white">{formatCurrency(selectedPool.totalLiquidity)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">24h Volume</p>
                <p className="font-medium text-white">{formatCurrency(selectedPool.volume24h)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">APR</p>
                <p className="font-medium text-white">{formatPercentage(selectedPool.apr)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Fee</p>
                <p className="font-medium text-white">{selectedPool.fee * 100}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="font-medium text-white">
                  {selectedPool.isActive ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <span className="text-red-400">Inactive</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{selectedPool.token1.symbol} Reserve</p>
                <p className="font-medium text-white">{parseFloat(selectedPool.reserve1).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{selectedPool.token2.symbol} Reserve</p>
                <p className="font-medium text-white">{parseFloat(selectedPool.reserve2).toLocaleString()}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Created</p>
              <p className="font-medium text-white">
                {new Date(selectedPool.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading && !stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700">
              <div className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded w-32"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="bg-gray-800/50 border-gray-700">
          <div className="p-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
        <div className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Unable to Load Liquidity Data</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchLiquidityStats} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          'Total Liquidity',
          stats ? formatCurrency(stats.totalLiquidity) : '$0',
          <DollarSign className="h-5 w-5 text-green-400" />,
          'up',
          'Across all pools'
        )}
        {renderMetricCard(
          '24h Volume',
          stats ? formatCurrency(stats.totalVolume24h) : '$0',
          <Activity className="h-5 w-5 text-blue-400" />,
          'up',
          'Trading volume'
        )}
        {renderMetricCard(
          'Active Pools',
          stats ? stats.activePools.toString() : '0',
          <Droplets className="h-5 w-5 text-purple-400" />,
          'neutral',
          `of ${stats?.totalPools || 0} total`
        )}
        {renderMetricCard(
          'Average APR',
          stats ? formatPercentage(stats.averageAPR) : '0%',
          <TrendingUp className="h-5 w-5 text-orange-400" />,
          'up',
          'Across active pools'
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTopPools()}
        {selectedPool ? renderPoolDetails() : (
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="p-8 text-center">
              <Droplets className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Select a Pool</h3>
              <p className="text-gray-400">
                Click on any pool from the list to view detailed information
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Network Metrics */}
      {stats?.networkMetrics && (
        <Card className="bg-gray-800/50 border-gray-700">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Network Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Gas Price</p>
                <p className="font-medium text-white">{stats.networkMetrics.gasPrice}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Block Number</p>
                <p className="font-medium text-white">{stats.networkMetrics.blockNumber.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="font-medium text-white">
                  {new Date(stats.networkMetrics.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
