'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Mail, Lock, Loader2, UserPlus, LogIn, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AuthFormTabs } from './AuthFormTabs';
import { useAuthActions } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const AuthForm = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuthActions();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (activeTab === 'login') {
        await login(values);
        toast.success('Welcome back!', {
          description: 'You have successfully logged in.',
        });
      } else {
        await register(values);
        toast.success('Account created!', {
          description: 'Your account has been successfully created.',
        });
      }
      router.push('/');
    } catch (error) {
      toast.error('Authentication failed', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      form.setError('root', {
        type: 'manual',
        message: 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    form.reset(); 
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Bitcoin className="h-6 w-6 mr-2" />
          CryptoBundler
        </div>
         <div className="relative z-20 flex items-center justify-center h-full">
          <Image
            src="/banner2.png"
            alt="CryptoBundler Banner"
            width={800}
            height={600}
            className="object-contain w-11/12"
            priority
          />
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <footer className="text-sm">CryptoBundler © {new Date().getFullYear()}</footer>
          </blockquote>
        </div>
      </div>
      
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="space-y-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardTitle className="text-2xl">
                    {activeTab === 'login' ? 'Welcome back' : 'Create an account'}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === 'login' 
                      ? 'Log in with your email and password' 
                      : 'Create an account with this form'}
                  </CardDescription>
                </motion.div>
              </AnimatePresence>
            </CardHeader>
            
            <CardContent className="grid gap-4">
              <AuthFormTabs activeTab={activeTab} onTabChange={handleTabChange} />
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                    className='space-y-2'
                      key={`form-${activeTab}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <FormControl>
                                <Input
                                  placeholder="email@example.com"
                                  className="pl-10"
                                  {...field}
                                  autoComplete="email"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <FormControl>
                                <PasswordInput 
                                  placeholder="••••••••" 
                                  className="pl-10"
                                  {...field} 
                                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {form.formState.errors.root && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium text-destructive"
                    >
                      {form.formState.errors.root.message}
                    </motion.p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full gap-2" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : activeTab === 'login' ? (
                      <>
                        <LogIn className="h-4 w-4" />
                        Sign in
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Sign up
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`footer-${activeTab}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-center text-sm text-muted-foreground"
                >
                  {activeTab === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => handleTabChange('register')}
                        className="font-semibold text-primary hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => handleTabChange('login')}
                        className="font-semibold text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </motion.p>
              </AnimatePresence>
            </CardFooter>
          </Card>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground">
                By continuing, you agree to our{' '}
                <Link 
                  href="/terms" 
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link 
                  href="/privacy" 
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </p>
            </CardFooter>
          </motion.div>
        </div>
      </div>
    </div>
  );
};