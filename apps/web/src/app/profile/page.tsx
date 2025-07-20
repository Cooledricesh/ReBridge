'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Save,
  Loader2,
  Search,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().optional(),
  isRegisteredDisability: z.boolean(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      fetchUserData();
      fetchKeywords();
    }
  }, [status, session, router]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch user data');
      
      const data = await response.json();
      setUserData(data);
      setValue('name', data.name || '');
      setValue('isRegisteredDisability', data.isRegisteredDisability || false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('프로필 정보를 불러오는데 실패했습니다.');
    }
  };

  const fetchKeywords = async () => {
    try {
      const response = await fetch('/api/crawler/keywords');
      if (!response.ok) throw new Error('Failed to fetch keywords');
      
      const data = await response.json();
      setKeywords(data.keywords || ['장애인']);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      setKeywords(['장애인']);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    const updatedKeywords = [...keywords, newKeyword.trim()];
    
    try {
      const response = await fetch('/api/crawler/keywords', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: updatedKeywords }),
      });

      if (!response.ok) throw new Error('Failed to update keywords');
      
      setKeywords(updatedKeywords);
      setNewKeyword('');
      toast.success('키워드가 추가되었습니다.');
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error('키워드 추가에 실패했습니다.');
    }
  };

  const handleRemoveKeyword = async (keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
    
    try {
      const response = await fetch('/api/crawler/keywords', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: updatedKeywords }),
      });

      if (!response.ok) throw new Error('Failed to update keywords');
      
      setKeywords(updatedKeywords);
      toast.success('키워드가 삭제되었습니다.');
    } catch (error) {
      console.error('Error removing keyword:', error);
      toast.error('키워드 삭제에 실패했습니다.');
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          isRegisteredDisability: data.isRegisteredDisability,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('프로필이 업데이트되었습니다.');
      
      // 비밀번호 필드 초기화
      setValue('currentPassword', '');
      setValue('newPassword', '');
      setValue('confirmPassword', '');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const showPasswordFields = !userData.provider || userData.provider === 'credentials';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/jobs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">프로필 설정</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                프로필 정보를 수정할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    value={userData.email}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
                <p className="text-sm text-gray-500">이메일은 변경할 수 없습니다.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="이름을 입력하세요"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRegisteredDisability"
                  {...register('isRegisteredDisability')}
                  checked={watch('isRegisteredDisability')}
                  onCheckedChange={(checked) => 
                    setValue('isRegisteredDisability', checked as boolean)
                  }
                />
                <Label
                  htmlFor="isRegisteredDisability"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  장애인 등록 여부
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* 크롤링 키워드 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>크롤링 키워드 설정</CardTitle>
              <CardDescription>
                채용 정보를 검색할 때 사용할 키워드를 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>현재 키워드</Label>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <div
                      key={keyword}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newKeyword">새 키워드 추가</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      id="newKeyword"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="추가할 키워드를 입력하세요"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    추가
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 비밀번호 변경 */}
          {showPasswordFields && (
            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경</CardTitle>
                <CardDescription>
                  비밀번호를 변경하려면 현재 비밀번호를 입력하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <Input
                      id="currentPassword"
                      type="password"
                      {...register('currentPassword')}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장하기
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 계정 정보 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">가입일</span>
                <span>{new Date(userData.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">로그인 방식</span>
                <span>{userData.provider === 'kakao' ? '카카오' : '이메일'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}