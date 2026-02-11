-- CreateTable
CREATE TABLE "MetaData" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaData_pkey" PRIMARY KEY ("id")
);
