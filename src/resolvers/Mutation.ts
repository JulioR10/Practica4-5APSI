import { Db } from "mongodb";
import { v4 as uuid } from "uuid";

export const Mutation = {
   SignIn: async ( parent: any, args: any,{clientDB, email, psw}:{clientDB:Db, email:string, psw:string}) => {
      const validator = await clientDB.collection("Users").findOne({email: email});
      if(validator){
         return "Error usuario ya existente.";
      }

      await clientDB.collection("Users").insertOne({
         id: uuid(),
         email: email,
         psw: psw,
         token: undefined,
         recipes: []
      });

      console.log("Signed.\n");
      return "Usuario registrado.";
   },

   SignOut: async (parent: any, args: any,{clientDB, email, psw, token}:{clientDB:Db,email:string,psw:string, token: string}) => {
      const validator = await clientDB.collection("Users").findOne({email: email, psw: psw, token: token});
      if(!validator){
         return "Error no eliminado."
      }
      const arrRecipes = validator.recipes;
      arrRecipes.forEach( async (elem:string) => {
         const busca = await clientDB.collection("Recipes").findOne({id: elem});
         if(!busca){
            return "Error signout.";
         }
         const arrIngredients = busca.ingredients;
         arrIngredients.forEach(async (element: string) => {
            const elimR = await clientDB.collection("Ingredients").updateOne(
               {name: element},
               {$pull: {
                  recipes: elem
               }}
            )
            if(!elimR){
               return "Error al eliminar receta de ingrediente.";
            }
         })
         const elimReceta = await clientDB.collection("Recipes").deleteOne({
            id: elem
         })
         if(!elimReceta){
            return "Error al eliminar las recetas."
         }
      });

      await clientDB.collection("Users").deleteOne({
         email: email,
         psw: psw,
         token: token
      });

      console.log("Sign Out.\n");
      return "Usuario eliminado.";
   },

   LogIn: async (parent: any, args: any,{clientDB, email, psw}:{clientDB:Db,email:string,psw:string}) => {
      const busca = await clientDB.collection("Users").findOne({email: email, token: undefined});
      if(!busca){
         return "Error en el LogIn.";
      }

      const token = uuid();
      await clientDB.collection("Users").updateOne({ email: email }, { $set: { token: token } });
      
      console.log("Loged.\n");
      return "Usuario logeado.";
   },

   LogOut: async (parent: any, args: any,{clientDB, email, psw, token}:{clientDB:Db,email:string,psw:string, token:string}) => {
      const busca = await clientDB.collection("Users").findOne({email: email, token: token});
      if(!busca){
         return "Error no deslogeado.";
      }

      await clientDB.collection("Users").updateOne({email: email}, {$set: {token: null}});

      console.log("LogOut.\n");
      return "Usuario deslogeado.";
   },

   AddIngredient: async (parent: any, args: {name: string}, {clientDB, email, psw, token}:{clientDB:Db, email: string, psw: string, token: string}) => {
      //BUSCA USUARIO
      const exist = await clientDB.collection("Users").findOne({
         email: email,
         psw: psw,
         token: token
      })
      if(!exist){
         return "Usuario no existente.";
      }
      //BUSCA INGREDIENT
      const busca = await clientDB.collection("Ingredients").findOne({name: args.name});
      if(busca){
         return "Error al añadir ingrediente.";
      }
      //INTRODUCE EL INGREDIENTE
      const id = uuid();
      await clientDB.collection("Ingredients").insertOne({
         id: id,
         name: args.name,
         recipes: []
      });
      
      console.log("AddIngredient.\n");
      return "Ingrediente añadido.";
   },

   DeleteIngredient: async (parent: any, args: {name: string}, {clientDB, email, psw, token}:{clientDB:Db, email: string, psw: string, token: string}) => {
      //BUSCA USUARIO
      const exist = await clientDB.collection("Users").findOne({
         email: email,
         psw: psw,
         token: token
      })
      if(!exist){
         return "Usuario no existente.";
      }
      //COMPROBAMOS QUE EL INGREDIENTE EXISTE
      const IngreValidator = await clientDB.collection("Ingredients").findOne({
         name: args.name
      })
      if(!IngreValidator){
         return "Error el ingrediente no existe.";
      }
      //PREPARAMOS TODO LO NECESARIO PARA ELIMINAR
      const arrRecet = IngreValidator.recipes;
      arrRecet.forEach(async (elem: string) => {
         //BUSCAMOS LAS RECETAS Y LAS METEMOS EN LA ARRAY AUXILIAR
         const buscamosReceta = await clientDB.collection("Recipes").findOne({
            id: elem
         })
         if(!buscamosReceta){
            return "Error no encontramos la receta."
         }
         //ELIMINAMOS LAS RECETAS
         const elimRec = await clientDB.collection("Recipes").deleteOne({
            id: elem
         })
         if(!elimRec){
            return "Error al eliminar la receta."
         }
         //ELIMINAMOS DE USUARIOS
         const elimUser = await clientDB.collection("Users").updateOne(
            {id: buscamosReceta.author},
            {$pull: {
               recipes: buscamosReceta.id
            }}
         )
         if(!elimUser){
            return "Error al eliminar del usuario."
         }
      });
      //ELIMINAMOS EL INGREDIENTE
      const eliminaIngre = await clientDB.collection("Ingredients").deleteOne({
         name: args.name
      })
      if(!eliminaIngre){
         return "No se pudo eliminar el ingrediente.";
      }

      console.log("DeleteIngredient.\n");
      return "Ingrediente eliminado.";
   },

   AddRecipe : async (parent: any, args: {name: string, description: string, ingredients: string[]},{clientDB, email, psw, token}:{clientDB:Db, email: string, psw: string, token: string}) => {
      //BUSCA USUARIO
      const exist = await clientDB.collection("Users").findOne({
         email: email,
         psw: psw,
         token: token
      })
      if(!exist){
         return "Usuario no existente.";
      }
      //BUSCA RECETA
      const busca = await clientDB.collection("Recipes").findOne({name: args.name});
      if(busca){
         return "Error al añadir receta, receta ya incluida.";
      }
      //BUSCA INGREDIENTES NO EXISTENTES
      const arrIngre: string[] = args.ingredients;
      arrIngre.forEach(async (elem: string) => {
         const IngreEncontrado = await clientDB.collection("Ingredients").findOne({name: elem});
         if(!IngreEncontrado){
            return "Uno de los ingredientes no esta en la base de datos.";
         }
      });
      //AÑADIMOS LA RECETA A LA DB
      const id = uuid();
      const recDB = await clientDB.collection("Recipes").insertOne({
         id: id,
         name: args.name,
         description: args.description,
         ingredients: args.ingredients,
         author: exist.id
      });
      if(!recDB){
         return "Error en el insert de la receta.";
      }
      //RECETAS A USUARIO
      const recUser = await clientDB.collection("Users").updateOne(
         {email: email, psw: psw, token: token},
         {$push:{
            recipes: id
         }}
      );
      if(!recUser){
         return "Error al actualizar las recetas en el usuario.";
      }
      //RECETAS A INGREDIENTES
      arrIngre.forEach(async (elem: string) => {
         const recIngre = await clientDB.collection("Ingredients").updateOne(
            {name: elem},
            {$push: {
               recipes: id
            }}
         )
         if(!recIngre){
            return "Error al actualizar las recetas en los ingredientes.";
         }
      })

      console.log("AddRecipe.\n");
      return "Receta añadida.";
   },

   UpdateRecipe: async (parent: any, args: {name: string, newname: string, newdescription: string/*, newingredients: string[]*/},{clientDB, email, psw, token}:{clientDB:Db, email: string, psw: string, token: string}) => {
      //BUSCA USUARIO
      const exist = await clientDB.collection("Users").findOne({
         email: email,
         psw: psw,
         token: token
      })
      if(!exist){
         return "Usuario no existente.";
      }
      //BUSCA RECETA
      const busca = await clientDB.collection("Recipes").findOne({name: args.newname});
      if(busca){
         return "Error al añadir receta, receta ya incluida.";
      }
      //ACTUALIZA LA RECETA
      const actu = await clientDB.collection("Recipes").updateOne(
         {name: args.name},
         {$set: {
            name: args.newname,
            description: args.newdescription,
            //ingredients: args.newingredients
         }}
      )
      if(!actu){
         return "Error al actualizar la receta.";
      }

      console.log("UpdateRecipe.\n");
      return "Receta actualizada.";
   },

   DeleteRecipe: async (parent: any, args: {name: string},{clientDB, email, psw, token}:{clientDB:Db, email: string, psw: string, token: string}) => {
      //BUSCA USUARIO
      const exist = await clientDB.collection("Users").findOne({
         email: email,
         psw: psw,
         token: token
      })
      if(!exist){
         return "Usuario no existente.";
      }
      //COMPROBAMOS QUE LA RECETA ES DEL USUARIO
      const validator = await clientDB.collection("Recipes").findOne({
         name: args.name,
         author: exist.id
      })
      if(!validator){
         return "Error la receta no existe/no existe para este usuario.";
      }
      //PREPARAMOS TODO LO NECESARIO PARA ELIMINAR
      const arrIngre = validator.ingredients;
      arrIngre.forEach(async (elem: string) => {
         //BUSCAMOS LOS INGREDIENTES Y LOS ELIMINAMOS
         const busca = await clientDB.collection("Ingredients").updateOne(
            {name: elem},
            {$pull: {
               recipes: validator.id
            }}
         )
         if(!busca){
            return "Error al actualizar ingredientes."
         }
      });
      //ELIMINAMOS DE USUARIOS
      const elimUser = await clientDB.collection("Users").updateOne(
         {email: exist.email, psw: exist.psw, token: exist.token, id: exist.id},
         {$pull: {
            recipes: validator.id
         }}
      )
      if(!elimUser){
         return "Error al eliminar del usuario.";
      }
      //ELIMINAMOS DE RECETAS
      const elimRec = await clientDB.collection("Recipes").deleteOne({
         id: validator.id,
         name: args.name,
         author: exist.id
      })
      if(!elimRec){
         return "Error al eliminar la receta.";
      }

      console.log("DeleteRecipe.\n");
      return "Receta eliminada.";
   }
}