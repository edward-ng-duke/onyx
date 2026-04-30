import { buildCCPairInfoUrl } from "@/app/admin/connector/[ccPairId]/lib";
import { PageSelector } from "@/components/PageSelector";
import { IndexAttemptStatus } from "@/components/Status";
import { deleteCCPair } from "@/lib/documentDeletion";
import { FailedConnectorIndexingStatus } from "@/lib/types";
import { Button } from "@opal/components";
import { ConfirmEntityModal } from "@/components/modals/ConfirmEntityModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@opal/components";
import Spacer from "@/refresh-components/Spacer";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FiLink, FiMaximize2, FiTrash } from "react-icons/fi";
import { mutate } from "swr";
import { toast } from "@/hooks/useToast";
import { SvgTrash } from "@opal/icons";
export function FailedReIndexAttempts({
  failedIndexingStatuses,
}: {
  failedIndexingStatuses: FailedConnectorIndexingStatus[];
}) {
  const tToast = useTranslations("toasts.admin.credentials");
  const t = useTranslations("admin.indexing.failedReindex");
  const tCommon = useTranslations("common.actions");
  const numToDisplay = 10;
  const [page, setPage] = useState(1);
  const [pendingConnectorDeletion, setPendingConnectorDeletion] = useState<{
    connectorId: number;
    credentialId: number;
    ccPairId: number;
    name: string;
  } | null>(null);

  const shouldConfirmConnectorDeletion = true;

  const anyDeletable = failedIndexingStatuses.some(
    (status) => status.is_deletable
  );

  return (
    <div className="mt-6 mb-8 p-4 border border-status-error-02 bg-status-error-00 rounded-lg">
      {pendingConnectorDeletion && (
        <ConfirmEntityModal
          danger
          entityType="connector"
          entityName={pendingConnectorDeletion.name}
          additionalDetails={t("deleteConfirmDetails")}
          onClose={() => setPendingConnectorDeletion(null)}
          onSubmit={async () => {
            try {
              await deleteCCPair(
                pendingConnectorDeletion.connectorId,
                pendingConnectorDeletion.credentialId,
                () =>
                  mutate(buildCCPairInfoUrl(pendingConnectorDeletion.ccPairId))
              );
            } catch (error) {
              console.error("Error deleting connector:", error);
              toast.error(tToast("deleteConnectorFailedRetry"));
            } finally {
              setPendingConnectorDeletion(null);
            }
          }}
        />
      )}

      <div className="text-status-error-05">
        <Text as="p" font="main-ui-action">
          {t("title")}
        </Text>
      </div>
      <Spacer rem={0.5} />
      <div className="text-status-error-05">
        <Text as="p">{t("description")}</Text>
      </div>
      <Spacer rem={1} />

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/8 sm:w-1/6">
                {t("connectorName")}
              </TableHead>
              <TableHead className="w-1/8 sm:w-1/6">{t("status")}</TableHead>
              <TableHead className="w-4/8 sm:w-2/6">
                {t("errorMessage")}
              </TableHead>
              <TableHead className="w-1/8 sm:w-1/6">
                {t("visitConnector")}
              </TableHead>
              {anyDeletable && (
                <TableHead className="w-1/8 sm:w-2/6">
                  {t("deleteConnector")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {failedIndexingStatuses
              .slice(numToDisplay * (page - 1), numToDisplay * page)
              .map((reindexingProgress) => {
                return (
                  <TableRow key={reindexingProgress.name}>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="text-link cursor-pointer flex"
                      >
                        <FiMaximize2 className="my-auto mr-1" />
                        {reindexingProgress.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <IndexAttemptStatus status="failed" />
                    </TableCell>

                    <TableCell>
                      <div>
                        <Text as="p">
                          {reindexingProgress.error_msg || "-"}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="ctext-link cursor-pointer flex"
                      >
                        <FiLink className="my-auto mr-1" />
                        {t("visitConnector")}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Button
                        disabled={!reindexingProgress.is_deletable}
                        variant="danger"
                        onClick={async () => {
                          if (shouldConfirmConnectorDeletion) {
                            setPendingConnectorDeletion({
                              connectorId: reindexingProgress.connector_id,
                              credentialId: reindexingProgress.credential_id,
                              ccPairId: reindexingProgress.cc_pair_id,
                              name:
                                reindexingProgress.name ??
                                t("connectorFallback"),
                            });
                            return;
                          }

                          try {
                            await deleteCCPair(
                              reindexingProgress.connector_id,
                              reindexingProgress.credential_id,
                              () =>
                                mutate(
                                  buildCCPairInfoUrl(
                                    reindexingProgress.cc_pair_id
                                  )
                                )
                            );
                          } catch (error) {
                            console.error("Error deleting connector:", error);
                            toast.error(tToast("deleteConnectorFailedRetry"));
                          }
                        }}
                        icon={SvgTrash}
                      >
                        {tCommon("delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(
                failedIndexingStatuses.length / numToDisplay
              )}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
