import { useMemo } from "react";

import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";


import { Eye } from "lucide-react";

type ExhibitionVisitor = {
  id: number ;
  fullName : string;
  phone : string,
  age: number;
  gender : "Male" | "Female" | "Other" | "Prefer Not to say";
  interests : string[];
}

const ExhibitionTable = () => {

  const data : ExhibitionVisitor[] = [
    {
      id: 1,
      fullName: "Ananya Sharma",
      phone: "+91 9876543210",
      age: 24,
      gender: "Female",
      interests: ["Art", "Craft", "Food"],
    },
     {
      id: 2,
      fullName: "Rahul Verma",
      phone: "+91 9123456789",
      age: 28,
      gender: "Male",
      interests: ["Music & Activities", "Food"],
    },
     {
      id: 3,
      fullName: "Priya Singh",
      phone: "+91 9988776655",
      age: 22,
      gender: "Female",
      interests: ["Fashion", "Live Workshops"],
    },
  ];

  const columns = useMemo <MRT_ColumnDef<ExhibitionVisitor>[]>(
    () => [
      {
        accessorKey : "id",
        header : "ID",
        size: 70,
      },
       {
        accessorKey: "fullName",
        header: "Full Name",
        size: 180,
      },
      {
        accessorKey: "phone",
        header: "Phone Number",
        size: 160,
      },
      {
        accessorKey: "age",
        header: "Age",
        size: 80,
      },
      {
        accessorKey: "gender",
        header: "Gender",
        size: 140,
      },
      {
        accessorKey: "interests",
        header: "Interest",
        size: 250,

        Cell: ({ cell }) => {
          const interests = cell.getValue<string[]>() || [];

          return (
            <div className="flex flex-wrap gap-1">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                >
                  {interest}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,

  
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              console.log("View visitor:", row.original);
            }}
            className="flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-orange-600"
            title="View Pass"
          >
            <Eye size={18} />
          </button>
        ),
      },
    ],
    []
  );

const table= useMaterialReactTable ({
  columns,
  data,

  enableColumnActions : false,
  enableColumnFilters : true,
  enableSorting : true ,
  enablePagination : true,

  initialState : {
    pagination : {
      pageIndex : 0,
      pageSize : 10,
    },

  },

  muiTableHeadCellProps : {
    sx : {
      fontWeight : 700,
      fontSize : "14px",
    },
  },

  muiTableBodyCellProps:{
    sx:{
      fontSize : "14px",
    },
  },
});

  return (
    <div className="w-full">
      <MaterialReactTable table={table}/>


    </div>
  );
};

export default ExhibitionTable;