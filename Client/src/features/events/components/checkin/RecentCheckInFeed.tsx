import { CheckCircle2, RotateCcw, Clock, ShieldCheck, UserCheck } from "lucide-react";
import type { CheckInLog } from "../../types/eventTypes";

interface RecentCheckInFeedProps {
  logs: CheckInLog[];
  onUndoCheckIn?: (attendeeId: string) => void;
}

export const RecentCheckInFeed = ({ logs, onUndoCheckIn }: RecentCheckInFeedProps) => {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs dark:border-slate-800">
        <div className="flex items-center gap-2">
          <UserCheck size={16} className="text-orange-600" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Live Gate Entry Activity Feed
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-gray-400">
          {logs.length} Total Logs
        </span>
      </div>

      <div className="mt-3 divide-y divide-gray-100 dark:divide-slate-800 overflow-y-auto max-h-[360px] custom-scrollbar text-xs">
        {logs.length > 0 ? (
          logs.map((log) => {
            const isSuccess = log.status === "Success";
            return (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5 transition hover:bg-gray-50/50 dark:hover:bg-slate-800/40 px-1 rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isSuccess
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-500 dark:bg-slate-800"
                    }`}
                  >
                    {isSuccess ? <CheckCircle2 size={15} /> : <RotateCcw size={15} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {log.attendeeName}
                      </span>
                      <span className="font-mono text-[10px] rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                        {log.passCode}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      {log.ticketType} {log.seatNumber ? `· Seat ${log.seatNumber}` : ""} · By{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {log.operatorName}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {isSuccess && onUndoCheckIn && (
                    <button
                      type="button"
                      onClick={() => onUndoCheckIn(log.attendeeId)}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-800"
                      title="Undo check-in"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-gray-400">
            <Clock size={24} className="mx-auto mb-1.5 opacity-40" />
            <p className="font-medium">No check-in entries logged yet today.</p>
          </div>
        )}
      </div>
    </div>
  );
};
