import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/useToast";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import CenteredPageSelector from "./CenteredPageSelector";
import { ThreeDotsLoader } from "@/components/Loading";
import { InvitedUserSnapshot } from "@/lib/types";
import { TableHeader } from "@/components/ui/table";
import { Button } from "@opal/components";
import { ErrorCallout } from "@/components/ErrorCallout";
import { FetchError } from "@/lib/fetcher";
import { ConfirmEntityModal } from "@/components/modals/ConfirmEntityModal";
import { SvgCheck } from "@opal/icons";
const USERS_PER_PAGE = 10;

interface Props {
  users: InvitedUserSnapshot[];
  mutate: () => void;
  error: FetchError | null;
  isLoading: boolean;
  q: string;
}

const PendingUsersTable = ({ users, mutate, error, isLoading, q }: Props) => {
  const t = useTranslations("components.pendingUsersTable");
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [userToApprove, setUserToApprove] = useState<string | null>(null);

  if (!users.length) return <p>{t("emptyState")}</p>;

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  // Filter users based on the search query
  const filteredUsers = q
    ? users.filter((user) => user.email.includes(q))
    : users;

  // Get the current page of users
  const currentPageOfUsers = filteredUsers.slice(
    (currentPageNum - 1) * USERS_PER_PAGE,
    currentPageNum * USERS_PER_PAGE
  );

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error) {
    return (
      <ErrorCallout
        errorTitle={t("loadError")}
        errorMsg={error?.info?.detail}
      />
    );
  }

  const handleAcceptRequest = async (email: string) => {
    const normalizedEmail = email.toLowerCase();
    try {
      await fetch("/api/tenants/users/invite/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      mutate();
      setUserToApprove(null);
    } catch (error) {
      toast.error(t("approveFailed"));
    }
  };

  return (
    <>
      {userToApprove && (
        <ConfirmEntityModal
          entityType={t("joinRequest")}
          entityName={userToApprove}
          onClose={() => setUserToApprove(null)}
          onSubmit={() => handleAcceptRequest(userToApprove)}
          actionButtonText={t("approve")}
          action={t("approveAction")}
          additionalDetails={t("approveDetails", { email: userToApprove })}
          removeConfirmationText
        />
      )}
      <Table className="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead>{t("email")}</TableHead>
            <TableHead>
              <div className="flex justify-end">{t("actions")}</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentPageOfUsers.length ? (
            currentPageOfUsers.map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      prominence="secondary"
                      onClick={() => setUserToApprove(user.email.toLowerCase())}
                      icon={SvgCheck}
                    >
                      {t("acceptJoinRequest")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">
                {t("noPendingMatching", { query: q })}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <CenteredPageSelector
          currentPage={currentPageNum}
          totalPages={totalPages}
          onPageChange={setCurrentPageNum}
        />
      ) : null}
    </>
  );
};

export default PendingUsersTable;
