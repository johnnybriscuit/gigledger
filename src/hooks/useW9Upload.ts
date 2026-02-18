/**
 * Hook for uploading and managing W-9 documents
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useW9Upload() {
  const queryClient = useQueryClient();

  const uploadW9 = useMutation({
    mutationFn: async ({ subcontractorId, file }: { subcontractorId: string; file: File }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate file path: subcontractor-w9s/{userId}/{subcontractorId}/{filename}
      const fileExt = file.name.split('.').pop();
      const fileName = `w9_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${subcontractorId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('subcontractor-w9s')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('subcontractor-w9s')
        .getPublicUrl(filePath);

      // Update subcontractor record
      const { error: updateError } = await supabase
        .from('subcontractors')
        .update({
          w9_document_url: filePath, // Store path, not public URL
          w9_status: 'received',
        })
        .eq('id', subcontractorId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return { filePath, publicUrl };
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-1099-totals'] });
    },
  });

  const deleteW9 = useMutation({
    mutationFn: async ({ subcontractorId, filePath }: { subcontractorId: string; filePath: string }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('subcontractor-w9s')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update subcontractor record
      const { error: updateError } = await supabase
        .from('subcontractors')
        .update({
          w9_document_url: null,
          w9_status: 'missing',
        })
        .eq('id', subcontractorId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-1099-totals'] });
    },
  });

  const toggleW9Status = useMutation({
    mutationFn: async ({ subcontractorId, newStatus }: { subcontractorId: string; newStatus: 'missing' | 'received' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('subcontractors')
        .update({ w9_status: newStatus })
        .eq('id', subcontractorId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['subcontractor-1099-totals'] });
    },
  });

  const downloadW9 = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('subcontractor-w9s')
      .download(filePath);

    if (error) throw error;

    // Create download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop() || 'w9.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    uploadW9,
    deleteW9,
    toggleW9Status,
    downloadW9,
  };
}
