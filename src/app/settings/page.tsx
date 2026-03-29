'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useAppSelector } from '@/store';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import apiService from '@/services/api';

export default function SettingsPage() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui) || { mode: 'dark' };

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportData = async () => {
    setExportError(null);
    setIsExporting(true);

    try {
      const dataBlob = await apiService.exportUserData();
      const filename = `chenpilot-user-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const url = window.URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error: unknown) {
      let message = 'Failed to export user data.';

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (
          responseData &&
          typeof responseData === 'object' &&
          'message' in responseData &&
          typeof (responseData as Record<string, unknown>).message === 'string' &&
          (responseData as Record<string, unknown>).message
        ) {
          message = (responseData as Record<string, unknown>).message as string;
        } else if (error.message) {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout>
      <div className="h-full flex flex-col bg-black text-white overflow-hidden relative">
        {/* Simple Background */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        <div className="flex-1 overflow-auto relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Settings
              </h1>
              <p className="text-gray-300">
                Manage your account preferences and application settings.
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Settings */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Profile
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Name"
                        value={user?.name || ''}
                        disabled
                        placeholder="Your display name"
                      />
                    </div>
                    <div>
                      <Input
                        label="Email"
                        value={user?.email || ''}
                        disabled
                        placeholder="Your email address"
                      />
                    </div>
                    <div>
                      <Input
                        label="Wallet Address"
                        value={user?.address || ''}
                        disabled
                        placeholder="Your Starknet wallet address"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Appearance Settings */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Appearance
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <div className="flex space-x-4">
                        <Button
                          variant={theme.mode === 'light' ? 'primary' : 'ghost'}
                          size="sm"
                        >
                          Light
                        </Button>
                        <Button
                          variant={theme.mode === 'dark' ? 'primary' : 'ghost'}
                          size="sm"
                        >
                          Dark
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Transaction Notifications
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified when transactions complete
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Chat Notifications
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified of new AI agent responses
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Security */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Security
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <Button variant="ghost" className="w-full justify-start">
                      Change Password
                    </Button>

                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      loading={isExporting}
                      onClick={handleExportData}
                    >
                      {isExporting ? 'Exporting...' : 'Export My Data'}
                    </Button>

                    {exportError && (
                      <p className="text-sm text-red-400">{exportError}</p>
                    )}

                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
