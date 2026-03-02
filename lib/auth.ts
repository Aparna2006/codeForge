import { supabase, type User } from './supabase';

export async function signUp(
  email: string,
  password: string,
  username: string,
  fullName?: string,
  emailRedirectTo?: string
) {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
        emailRedirectTo,
      },
    });

    if (authError) {
      console.warn('[v0] Auth signup failed:', authError.message);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'User creation failed' };
    }

    // Best-effort profile creation. Do not block signup if table permissions/policies are not configured yet.
    let profileUsername = username;
    let { error: profileError } = await supabase.from('users').upsert(
      {
        id: authData.user.id,
        email,
        username: profileUsername,
        full_name: fullName || null,
      },
      { onConflict: 'id' }
    );

    if (profileError?.message?.toLowerCase().includes('username')) {
      profileUsername = `${username}_${Math.floor(Math.random() * 10000)}`;
      const retry = await supabase.from('users').upsert(
        {
          id: authData.user.id,
          email,
          username: profileUsername,
          full_name: fullName || null,
        },
        { onConflict: 'id' }
      );
      profileError = retry.error;
    }

    if (profileError) {
      console.warn('[v0] Profile creation skipped:', profileError.message);
    }

    // Best-effort stats creation. Do not block signup.
    const { error: statsError } = await supabase.from('user_stats').upsert(
      {
        user_id: authData.user.id,
        total_submissions: 0,
        total_accepted: 0,
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        acceptance_rate: 0,
      },
      { onConflict: 'user_id' }
    );
    if (statsError) {
      console.warn('[v0] Stats creation skipped:', statsError.message);
    }

    return { success: true, user: authData.user, session: authData.session };
  } catch (err) {
    console.error('[v0] Signup error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signIn(identifier: string, password: string) {
  try {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    let emailToUse = normalizedIdentifier;

    // Allow login with username by resolving it to the account email first.
    if (!normalizedIdentifier.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('email')
        .ilike('username', normalizedIdentifier)
        .limit(1)
        .maybeSingle();

      if (profileError) {
        console.warn('[v0] Username lookup failed:', profileError.message);
      }

      if (!profile?.email) {
        return { success: false, error: 'Invalid login credentials' };
      }

      emailToUse = String(profile.email).trim().toLowerCase();
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error) {
      console.warn('[v0] Sign in failed:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    console.error('[v0] Sign in error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[v0] Sign out error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[v0] Sign out error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function sendPasswordReset(email: string, redirectTo?: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[v0] Password reset error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function resendSignupConfirmation(email: string, redirectTo?: string) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[v0] Resend confirmation error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[v0] Update password error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[v0] Error fetching profile:', profileError);
      return null;
    }

    return profile;
  } catch (err) {
    console.error('[v0] Error getting current user:', err);
    return null;
  }
}

export async function updateProfile(userId: string, updates: Partial<User>) {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('[v0] Profile update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[v0] Update error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
