'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { mockProblems } from '@/lib/mock-data';

export default function StatsDashboard() {
  // Calculate stats from mock data
  const stats = {
    totalProblems: mockProblems.length,
    arrayCount: mockProblems.filter(p => p.category === 'Arrays').length,
    stringCount: mockProblems.filter(p => p.category === 'Strings').length,
    linkedListCount: mockProblems.filter(p => p.category === 'LinkedLists').length,
    treeCount: mockProblems.filter(p => p.category === 'Trees').length,
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader>
          <CardContent><div className="h-64 bg-muted rounded"></div></CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader>
          <CardContent><div className="h-64 bg-muted rounded"></div></CardContent>
        </Card>
      </div>
    );
  }

  const categoryData = [
    { name: 'Arrays', value: stats.arrayCount, fill: '#3b82f6' },
    { name: 'Strings', value: stats.stringCount, fill: '#22c55e' },
    { name: 'Linked Lists', value: stats.linkedListCount, fill: '#a855f7' },
    { name: 'Trees', value: stats.treeCount, fill: '#f97316' },
  ];

  const barData = [
    { name: 'Arrays', problems: stats.arrayCount },
    { name: 'Strings', problems: stats.stringCount },
    { name: 'LinkedLists', problems: stats.linkedListCount },
    { name: 'Trees', problems: stats.treeCount },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Problems by Category</CardTitle>
          <CardDescription>Distribution across data structures</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="problems" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
          <CardDescription>Percentage breakdown of all problems</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
