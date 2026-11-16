"use client"

import * as React from "react"
import { Bell, ChevronRight, Mail } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

function Showcase({ id }: { id: string }) {
  return (
    <div id={id} className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Nút</CardTitle>
          <CardDescription>Mọi biến thể, kèm className ghi đè (tailwind-merge).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Mặc định</Button>
          <Button variant="secondary">Phụ</Button>
          <Button variant="destructive">Xoá</Button>
          <Button variant="outline">Viền</Button>
          <Button variant="ghost">Ma</Button>
          <Button variant="link">Liên kết</Button>
          <Button size="sm" className="px-8 rounded-full">Ghi đè px</Button>
          <Button size="lg" className="h-12 bg-red-500 text-lg">Ghi đè màu</Button>
          <Button size="icon" aria-label="chuông"><Bell /></Button>
          <Button variant="outline" className="w-full justify-start"><Mail /> Hộp thư</Button>
          <Button disabled>Tắt</Button>
        </CardContent>
        <CardFooter className="justify-between border-t">
          <Badge>Mới</Badge>
          <Badge variant="secondary">Phụ</Badge>
          <Badge variant="destructive">Lỗi</Badge>
          <Badge variant="outline" className="rounded-sm px-1">Viền</Badge>
        </CardFooter>
      </Card>

      <Card className="gap-4 py-4">
        <CardContent className="space-y-4">
          <Alert>
            <Bell />
            <AlertTitle>Thông báo</AlertTitle>
            <AlertDescription>Bản build đã rút gọn tên class.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>Không có gì sai cả.</AlertDescription>
          </Alert>
          <div className="grid gap-2">
            <Label htmlFor={id + "-email"}>Email</Label>
            <Input id={id + "-email"} placeholder="ten@vi.du" />
            <Input aria-invalid="true" defaultValue="sai" className="h-8" />
            <Textarea placeholder="Ghi chú" />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id={id + "-c"} defaultChecked />
            <Label htmlFor={id + "-c"}>Đồng ý</Label>
            <Switch defaultChecked />
            <Switch />
          </div>
          <RadioGroup defaultValue="b" className="flex gap-4">
            <RadioGroupItem value="a" aria-label="a" />
            <RadioGroupItem value="b" aria-label="b" />
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Tabs defaultValue="one">
            <TabsList>
              <TabsTrigger value="one">Một</TabsTrigger>
              <TabsTrigger value="two">Hai</TabsTrigger>
            </TabsList>
            <TabsContent value="one">Nội dung tab một.</TabsContent>
            <TabsContent value="two">Nội dung tab hai.</TabsContent>
          </Tabs>
          <Accordion type="single" collapsible defaultValue="a">
            <AccordionItem value="a">
              <AccordionTrigger>Câu hỏi mở</AccordionTrigger>
              <AccordionContent>Câu trả lời.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Câu hỏi đóng</AccordionTrigger>
              <AccordionContent>Ẩn.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <Collapsible defaultOpen className="mt-4 rounded-md border p-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">Thu gọn <ChevronRight /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="text-muted-foreground text-sm">Phần mở rộng.</CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableCaption>Hoá đơn gần đây</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mã</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {["INV001", "INV002", "INV003"].map((code) => (
                <TableRow key={code} data-state={code === "INV002" ? "selected" : undefined}>
                  <TableCell className="font-medium">{code}</TableCell>
                  <TableCell>Đã trả</TableCell>
                  <TableCell className="text-right">250.000 đ</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Trang chủ</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Thành phần</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
              <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
              <PaginationItem><PaginationEllipsis /></PaginationItem>
              <PaginationItem><PaginationNext href="#" /></PaginationItem>
            </PaginationContent>
          </Pagination>
          <Progress value={60} />
          <Separator />
          <div className="flex items-center gap-4">
            <Avatar><AvatarFallback>VN</AvatarFallback></Avatar>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <Slider defaultValue={[40]} max={100} step={1} />
          <div className="flex gap-2">
            <Toggle aria-label="đậm" defaultPressed>B</Toggle>
            <Toggle variant="outline" aria-label="nghiêng">I</Toggle>
            <ToggleGroup type="single" defaultValue="c" variant="outline">
              <ToggleGroupItem value="l">Trái</ToggleGroupItem>
              <ToggleGroupItem value="c">Giữa</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex gap-2">
            <Select>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Chọn" /></SelectTrigger>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline">Menu</Button></DropdownMenuTrigger>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <Calendar mode="single" month={new Date(2026, 0, 1)} selected={new Date(2026, 0, 15)} className="rounded-md border" />
          <InputOTP maxLength={6} value="12">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="space-y-4">
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Tìm lệnh..." />
            <CommandList>
              <CommandEmpty>Không thấy.</CommandEmpty>
              <CommandGroup heading="Gợi ý">
                <CommandItem>Lịch</CommandItem>
                <CommandItem>Tìm emoji</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
          <ScrollArea className="h-24 w-48 rounded-md border">
            <div className="p-4">{Array.from({ length: 10 }, (_, i) => <div key={i} className="text-sm">Dòng {i + 1}</div>)}</div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <main>
      <Showcase id="light" />
      <div className="dark bg-background text-foreground">
        <Showcase id="dark" />
      </div>
    </main>
  )
}
