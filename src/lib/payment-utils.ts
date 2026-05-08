 import { db } from "@/integrations/supabase/untyped";
 
 export async function getActivePaymentProvider() {
   const { data } = await db.from("app_settings").select("value").eq("key", "pagbank_enabled").maybeSingle();
   return data?.value === "true" ? "pagbank" : "asaas";
 }
 
 export async function invokePaymentFunction(payload: any) {
   const provider = await getActivePaymentProvider();
   
   if (provider === "pagbank") {
     // Map payload to PagBank format
     const pagBankPayload = {
       customerName: payload.customerName,
       customerEmail: payload.customerEmail,
       customerCpf: payload.customerCpf,
       customerPhone: payload.customerMobilePhone || payload.customerPhone,
       value: payload.value,
       description: payload.description,
       referenceId: payload.appointmentId || payload.planId || payload.renewalId,
       paymentMethod: payload.billingType === "PIX" ? "PIX" : "CREDIT_CARD",
     };
     
     const { data, error } = await db.functions.invoke("create-pagbank-payment", { body: pagBankPayload });
     if (error) return { data: null, error };
     
     // Map PagBank response back to common format
     return {
       data: {
         success: data.success,
         pixQrCode: data.pixQrCode,
         pixCopyPaste: data.pixText,
         paymentId: data.orderId,
         ...data
       },
       error: null
     };
   }
   
   // Default to Asaas
   return await db.functions.invoke("create-asaas-payment", { body: payload });
 }