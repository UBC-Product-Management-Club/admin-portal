import type { User } from '@/lib/types/User';
import { DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarImage } from './ui/avatar';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { Badge } from './ui/badge';

function UniversityBadge(university: User['university'], studentId: User['studentId']) {
  switch (university) {
    case 'University of British Columbia':
      return (
        <Badge className="bg-blue-500 text-white">
          {university} ({studentId})
        </Badge>
      );
    case 'Simon Fraser University':
      return <Badge className="bg-red-500 text-white">{university}</Badge>;
    case 'British Columbia Institute of Technology':
      return <Badge className="bg-amber-300">{university}</Badge>;
    default:
      return <Badge>{university}</Badge>;
  }
}

export function UserInfoDialog({ user }: { user: User }) {
  return (
    <DialogHeader className="p-4">
      <div className="flex flex-row justify-between">
        <div className="w-1/2">
          <DialogTitle>{user.displayName}</DialogTitle>
          <div className="inline-flex gap-2 items-center my-2">
            <p>
              {user.firstName} {user.lastName}
            </p>
            <Badge>{user.pronouns}</Badge>
          </div>
          <div className="w-inherit flex flex-row flex-wrap gap-2">
            {UniversityBadge(user.university, user.studentId)}

            {user.faculty && user.major && (
              <Badge>
                {user.faculty}: {user.major}
              </Badge>
            )}
            {user.year && <Badge variant="secondary">Year: {user.year}</Badge>}
            {
              <Badge variant={user.isPaymentVerified ? 'default' : 'destructive'}>
                {user.isPaymentVerified ? 'Member' : 'Non-member'}
              </Badge>
            }
          </div>
        </div>
        <Avatar className="w-fit h-fit">
          <AvatarImage src={user.pfp} alt="pfp" />
          <AvatarFallback>
            {user.firstName[0]}
            {user.lastName[0]}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="my-4">
        <h1 className="font-bold">Why Product Management?</h1>
        <p>{user.whyPm}</p>
      </div>
    </DialogHeader>
  );
}
